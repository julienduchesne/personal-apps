import { listBlobs, readFileStream, readJson, uploadFile, writeJson } from "@repo/storage";
import type { Note, Score, Staff } from "@/app/sightstring/score";

const prefix = "sightstring/scores/";
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const maxImageSize = 4_000_000;

type Context = { params: Promise<{ segments?: string[] }> };

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

function scoreKey(id: string) { return `${prefix}${id}.json`; }
function imageKey(id: string, image: string) { return `sightstring/images/${id}/${image}.jpg`; }

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function range(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function isNote(value: unknown): value is Note {
  return object(value) && typeof value.id === "string" && uuid.test(value.id)
    && range(value.x, 0, 2200) && range(value.y, 0, 2200)
    && range(value.step, -5, 16) && Number.isInteger(value.step)
    && (value.accidental === null || value.accidental === -1 || value.accidental === 0 || value.accidental === 1)
    && typeof value.hollow === "boolean";
}

function isScore(value: unknown, id: string): value is Score {
  const image = (entry: unknown): entry is string => {
    const base = `/api/sightstring/${id}/`;
    return typeof entry === "string" && entry.startsWith(base) && uuid.test(entry.slice(base.length));
  };
  const staff = (entry: unknown): entry is Staff => {
    if (!object(entry) || !image(entry.image)
      || !range(entry.width, 1, 2200) || !range(entry.height, 1, 2200)
      || !range(entry.left, 0, entry.width) || !range(entry.right, entry.left, entry.width)
      || !range(entry.top, 0, entry.height) || !range(entry.spacing, 1, entry.height)
      || !Array.isArray(entry.notes) || entry.notes.length > 500 || !entry.notes.every(isNote)) return false;
    const crop = entry.imageCrop;
    return crop === undefined || (object(crop) && range(crop.width, entry.width, 2200) && range(crop.height, entry.height, 2200)
      && range(crop.x, 0, crop.width - entry.width) && range(crop.y, 0, crop.height - entry.height));
  };
  return object(value) && value.id === id && typeof value.title === "string" && !!value.title.trim() && value.title.length <= 200
    && range(value.key, -7, 7) && Number.isInteger(value.key)
    && (value.pages === undefined || (Array.isArray(value.pages) && value.pages.length <= 24 && value.pages.every(image)))
    && Array.isArray(value.staves) && value.staves.length <= 250
    && value.staves.every(staff) && value.staves.some((entry) => entry.notes.length > 0);
}

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: Context) {
  if (!process.env.SITE_PASSWORD) return fail(503, "Score storage requires site authentication.");
  const segments = (await params).segments ?? [];
  if (segments.length === 0) {
    try {
      const keys = (await listBlobs(prefix, { strict: true })).filter((key) =>
        key.endsWith(".json") && uuid.test(key.slice(prefix.length, -5)));
      const scores = await Promise.all(keys.map((key) => readJson<Score>(key, { strict: true })));
      return Response.json(scores.filter(Boolean), { headers: { "Cache-Control": "private, no-store" } });
    } catch {
      return fail(502, "Couldn’t load the score library.");
    }
  }

  const [id, image] = segments;
  if (segments.length !== 2 || !uuid.test(id) || !uuid.test(image)) return fail(404, "Image not found.");
  const stream = await readFileStream(imageKey(id, image));
  if (!stream) return fail(404, "Image not found.");
  const headers = new Headers({
    "Content-Type": "image/jpeg",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  const filename = new URL(request.url).searchParams.get("download");
  if (filename !== null) {
    const safe = filename.replace(/[^a-zA-Z0-9 ._-]/g, "").trim().slice(0, 160) || "Sightstring scan";
    headers.set("Content-Disposition", `attachment; filename="${safe}.jpg"`);
  }
  return new Response(stream, { headers });
}

export async function PUT(request: Request, { params }: Context) {
  if (!process.env.SITE_PASSWORD) return fail(503, "Score storage requires site authentication.");
  const segments = (await params).segments ?? [];
  const [id, image] = segments;
  if (!id || !uuid.test(id) || segments.length > 2 || (image && !uuid.test(image))) {
    return fail(404, "Score not found.");
  }
  if (image) {
    if (request.headers.get("Content-Type") !== "image/jpeg") return fail(415, "Expected a JPEG image.");
    const body = new Uint8Array(await request.arrayBuffer());
    if (body.length > maxImageSize) return fail(413, "Image is too large.");
    if (body[0] !== 0xff || body[1] !== 0xd8 || body[2] !== 0xff) return fail(400, "Invalid JPEG image.");
    try {
      await uploadFile(imageKey(id, image), body, "image/jpeg");
      return new Response(null, { status: 204 });
    } catch {
      return fail(502, "Couldn’t save the scan image.");
    }
  }

  const score: unknown = await request.json().catch(() => null);
  if (!isScore(score, id)) return fail(400, "Invalid score.");
  try {
    const images = new Set(await listBlobs(`sightstring/images/${id}/`, { strict: true }));
    const sources = [...(score.pages ?? []), ...score.staves.map((staff) => staff.image!)];
    if (sources.some((source) => !images.has(imageKey(id, source.split("/").at(-1)!)))) {
      return fail(409, "Some scan images haven’t been uploaded yet.");
    }
    // Publish the score after its images so a failed rescan leaves the saved version readable.
    await writeJson(scoreKey(id), score);
    return new Response(null, { status: 204 });
  } catch {
    return fail(502, "Couldn’t save the score.");
  }
}

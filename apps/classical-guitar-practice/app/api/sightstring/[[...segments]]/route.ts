import { deleteBlob, listBlobs, readFileStream, readJson, uploadFile, writeJson } from "@repo/storage";
import { beatUnits, exercise, leaderboardSize, noteDurations, type Meter, type Note, type PracticeAttempt, type Score, type Staff } from "@/app/sightstring/score";

const prefix = "sightstring/scores/";
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const maxImageSize = 4_000_000;

type Context = { params: Promise<{ segments?: string[] }> };

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

function scoreKey(id: string) { return `${prefix}${id}.json`; }
function deletedKey(id: string) { return `${prefix}${id}.deleted`; }
function imageKey(id: string, image: string) { return `sightstring/images/${id}/${image}.jpg`; }

async function isDeleted(id: string) {
  return id !== exercise.id && await readJson<boolean>(deletedKey(id), { strict: true }) === true;
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function range(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function isNote(value: unknown, generated: boolean): value is Note {
  return object(value) && typeof value.id === "string" && uuid.test(value.id)
    && range(value.x, 0, 2200) && range(value.y, 0, 2200)
    && range(value.step, -5, generated ? 20 : 16) && Number.isInteger(value.step)
    && (value.accidental === null || value.accidental === -1 || value.accidental === 0 || value.accidental === 1)
    && (value.finger === undefined || (range(value.finger, 0, 4) && Number.isInteger(value.finger)))
    && (value.duration === undefined || noteDurations.some((duration) => duration === value.duration))
    && (value.stem === undefined || (object(value.stem) && range(value.stem.x, 0, 2200)
      && range(value.stem.y, 0, 2200) && typeof value.stem.up === "boolean"))
    && (value.beam === undefined || (object(value.beam) && typeof value.beam.to === "string" && uuid.test(value.beam.to)
      && range(value.beam.count, 1, 4) && Number.isInteger(value.beam.count)))
    && (value.voice === undefined || (generated && (value.voice === "bass" || value.voice === "melody")))
    && typeof value.hollow === "boolean";
}

function isMeter(value: unknown): value is Meter {
  return object(value) && range(value.beats, 1, 32) && Number.isInteger(value.beats)
    && beatUnits.some((unit) => unit === value.beatUnit);
}

function isScore(value: unknown, id: string): value is Score {
  const image = (entry: unknown): entry is string => {
    const base = `/api/sightstring/${id}/`;
    return typeof entry === "string" && entry.startsWith(base) && uuid.test(entry.slice(base.length));
  };
  const generated = object(value) && value.generated === true;
  const staff = (entry: unknown): entry is Staff => {
    if (!object(entry) || (generated ? entry.image !== undefined || entry.imageCrop !== undefined : !image(entry.image))
      || !range(entry.width, 1, 2200) || !range(entry.height, 1, 2200)
      || !range(entry.left, 0, entry.width) || !range(entry.right, entry.left, entry.width)
      || !range(entry.top, 0, entry.height) || !range(entry.spacing, 1, entry.height)
      || !Array.isArray(entry.notes) || entry.notes.length > 500 || !entry.notes.every((note) => isNote(note, generated))) return false;
    if (entry.timeSignature !== undefined && (!isMeter(entry.timeSignature) || !("x" in entry.timeSignature)
      || !range(entry.timeSignature.x, entry.left, entry.right))) return false;
    const barlines = entry.barlines;
    const left = entry.left;
    const right = entry.right;
    if (barlines !== undefined && (!Array.isArray(barlines) || barlines.length > 250
      || !barlines.every((bar, index) => range(bar, left, right) && (index === 0 || bar > barlines[index - 1])))) return false;
    for (const [field, max] of [["page", 24], ["line", 250], ["track", 32]] as const) {
      if (entry[field] !== undefined && (!range(entry[field], 1, max) || !Number.isInteger(entry[field]))) return false;
    }
    const crop = entry.imageCrop;
    return crop === undefined || (object(crop) && range(crop.width, entry.width, 2200) && range(crop.height, entry.height, 2200)
      && range(crop.x, 0, crop.width - entry.width) && range(crop.y, 0, crop.height - entry.height));
  };
  return object(value) && value.id === id && typeof value.title === "string" && !!value.title.trim() && value.title.length <= 200
    && range(value.key, -7, 7) && Number.isInteger(value.key)
    && (value.generated === undefined || generated)
    && (value.timeSignature == null || isMeter(value.timeSignature))
    && (value.pages === undefined || (!generated && Array.isArray(value.pages) && value.pages.length <= 24 && value.pages.every(image)))
    && Array.isArray(value.staves) && value.staves.length <= 250
    && value.staves.every(staff) && value.staves.some((entry) => entry.notes.length > 0);
}

function attemptPrefix(id: string, track: string) {
  if (!(uuid.test(id) || id === exercise.id) || !/^[1-9]\d?$/.test(track) || Number(track) > 32) return;
  return `sightstring/attempts/${id}/${track}/`;
}

function isAttempt(value: unknown, id: string): value is PracticeAttempt {
  return object(value) && value.id === id && typeof value.durationMs === "number"
    && Number.isSafeInteger(value.durationMs) && value.durationMs >= 0
    && typeof value.completedAt === "string" && value.completedAt.length === 24
    && Number.isFinite(Date.parse(value.completedAt));
}

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: Context) {
  if (!process.env.SITE_PASSWORD) return fail(503, "Score storage requires site authentication.");
  const segments = (await params).segments ?? [];
  if (segments.length === 0) {
    try {
      const blobs = new Set(await listBlobs(prefix, { strict: true }));
      const keys = [...blobs].filter((key) => {
        const id = key.slice(prefix.length, -5);
        return key.endsWith(".json") && uuid.test(id) && !blobs.has(deletedKey(id));
      });
      const scores = await Promise.all(keys.map((key) => readJson<Score>(key, { strict: true })));
      return Response.json(scores.filter(Boolean), { headers: { "Cache-Control": "private, no-store" } });
    } catch {
      return fail(502, "Couldn’t load the score library.");
    }
  }

  const [id, image, track] = segments;
  if (segments.length === 3 && image === "attempts") {
    const path = attemptPrefix(id, track);
    if (!path) return fail(404, "Leaderboard not found.");
    try {
      if (await isDeleted(id)) return fail(410, "Score deleted.");
      // Sorting the duration in the object key lets us fetch only the fastest attempts.
      const keys = (await listBlobs(path, { strict: true })).sort().slice(0, leaderboardSize);
      const attempts = await Promise.all(keys.map((key) => readJson<PracticeAttempt>(key, { strict: true })));
      return Response.json(attempts.filter(Boolean), { headers: { "Cache-Control": "private, no-store" } });
    } catch {
      return fail(502, "Couldn’t load the leaderboard.");
    }
  }
  if (segments.length !== 2 || !uuid.test(id) || !uuid.test(image)) return fail(404, "Image not found.");
  let stream: ReadableStream | null;
  try {
    if (await isDeleted(id)) return fail(410, "Score deleted.");
    stream = await readFileStream(imageKey(id, image));
  } catch {
    return fail(502, "Couldn’t load the scan image.");
  }
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
  const [id, image, track, attemptId] = segments;
  if (segments.length === 4 && image === "attempts") {
    const path = attemptPrefix(id, track);
    if (!path || !uuid.test(attemptId)) return fail(404, "Attempt not found.");
    const attempt: unknown = await request.json().catch(() => null);
    if (!isAttempt(attempt, attemptId)) return fail(400, "Invalid practice attempt.");
    const { durationMs, completedAt } = attempt;
    try {
      if (await isDeleted(id)) return fail(410, "Score deleted.");
      const duration = String(durationMs).padStart(16, "0");
      await writeJson(`${path}${duration}-${attemptId}.json`, { id: attemptId, durationMs, completedAt });
      return new Response(null, { status: 204 });
    } catch {
      return fail(502, "Couldn’t save the attempt.");
    }
  }
  if (!id || !uuid.test(id) || segments.length > 2 || (image && !uuid.test(image))) {
    return fail(404, "Score not found.");
  }
  try {
    if (await isDeleted(id)) return fail(410, "Score deleted.");
  } catch {
    return fail(502, "Couldn’t check the score.");
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
    if (!score.generated) {
      const images = new Set(await listBlobs(`sightstring/images/${id}/`, { strict: true }));
      const sources = [...(score.pages ?? []), ...score.staves.map((staff) => staff.image!)];
      if (sources.some((source) => !images.has(imageKey(id, source.split("/").at(-1)!)))) {
        return fail(409, "Some scan images haven’t been uploaded yet.");
      }
    }
    // Publish the score after its images so a failed rescan leaves the saved version readable.
    await writeJson(scoreKey(id), score);
    return new Response(null, { status: 204 });
  } catch {
    return fail(502, "Couldn’t save the score.");
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!process.env.SITE_PASSWORD) return fail(503, "Score storage requires site authentication.");
  const segments = (await params).segments ?? [];
  const [id] = segments;
  if (segments.length !== 1 || !uuid.test(id)) return fail(404, "Score not found.");
  try {
    // Keep the marker so stale saves and recovery from old browser libraries can’t restore the score.
    await writeJson(deletedKey(id), true);
    const related = await Promise.all([
      listBlobs(`sightstring/images/${id}/`, { strict: true }),
      listBlobs(`sightstring/attempts/${id}/`, { strict: true }),
    ]);
    await Promise.all([scoreKey(id), ...related.flat()].map(deleteBlob));
    return new Response(null, { status: 204 });
  } catch {
    return fail(502, "Couldn’t finish deleting the score.");
  }
}

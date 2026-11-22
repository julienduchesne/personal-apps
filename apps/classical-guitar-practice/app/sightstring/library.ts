import type { PracticeAttempt, Score } from "./score";

const api = "/api/sightstring";

async function requireSuccess(response: Response) {
  if (response.ok && !response.redirected) return response;
  throw new Error("Couldn’t reach score storage.");
}

export async function listScores(): Promise<Score[]> {
  return (await requireSuccess(await fetch(api, { cache: "no-store" }))).json();
}

export async function listBestAttempts(scoreId: string, track: number, signal: AbortSignal): Promise<PracticeAttempt[]> {
  const response = await fetch(`${api}/${scoreId}/attempts/${track}`, { cache: "no-store", signal });
  return (await requireSuccess(response)).json();
}

export async function saveAttempt(scoreId: string, track: number, attempt: PracticeAttempt): Promise<void> {
  await requireSuccess(await fetch(`${api}/${scoreId}/attempts/${track}/${attempt.id}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(attempt), keepalive: true,
  }));
}

export async function saveScore(score: Score): Promise<Score> {
  const uploads = new Map<string, Promise<string>>();
  function saveImage(source: string): Promise<string> {
    if (source.startsWith(`${api}/${score.id}/`)) return Promise.resolve(source);
    const pending = uploads.get(source);
    if (pending) return pending;
    const target = `${api}/${score.id}/${crypto.randomUUID()}`;
    const upload = (async () => {
      const image = await (await fetch(source)).blob();
      await requireSuccess(await fetch(target, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: image }));
      return target;
    })();
    uploads.set(source, upload);
    return upload;
  }

  const pages = score.pages && await Promise.all(score.pages.map(saveImage));
  const staves = await Promise.all(score.staves.map(async (staff) => ({
    ...staff, image: staff.image && await saveImage(staff.image),
  })));
  const saved = { ...score, pages, staves };
  await requireSuccess(await fetch(`${api}/${score.id}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(saved),
  }));
  return saved;
}

export async function recoverLocalScores(): Promise<Score[]> {
  const database = await new Promise<IDBDatabase | null>((resolve, reject) => {
    const open = indexedDB.open("sightstring", 1);
    open.onupgradeneeded = () => {
      // Recovery should leave browsers without a legacy library unchanged.
      open.transaction?.abort();
      resolve(null);
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  if (!database) return [];
  try {
    return await new Promise<Score[]>((resolve, reject) => {
      const request = database.transaction("scores").objectStore("scores").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export function downloadUrl(source: string, filename: string) {
  return source.startsWith(`${api}/`) ? `${source}?download=${encodeURIComponent(filename)}` : source;
}

export async function loadScanPhoto(source: string, index: number) {
  const response = await requireSuccess(await fetch(source));
  return new File([await response.blob()], `Page ${index + 1}.jpg`, { type: "image/jpeg" });
}

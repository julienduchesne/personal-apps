"use server";

import { revalidatePath } from "next/cache";
import { readJson, writeJson, listBlobs, uploadFile, deleteBlob } from "@repo/storage";
import { EXERCISES } from "@/lib/seed-exercises";
import type { Exercise, Piece, PlaytimeSession } from "@/lib/types";
import {
  type Proficiency,
  PROFICIENCY_LEVELS,
  type KnowledgeLevel,
  KNOWLEDGE_LEVELS,
} from "@/lib/types";
import {
  resolveExercisesByTitle,
  selectOnePerCategory,
  getFamiliarPiecesDue as _getFamiliarPiecesDue,
  getNewPiece as _getNewPiece,
} from "@/lib/daily-logic";

const PIECES_PATH = "data/pieces.json";

function dailyPath(date: string): string {
  return `data/daily-${date}.json`;
}

export async function getExercises(): Promise<Exercise[]> {
  return EXERCISES;
}

export async function getTodayExercises(
  date: string
): Promise<{ date: string; exercises: Exercise[] }> {
  const path = dailyPath(date);
  const existing = await readJson<{ date: string; exerciseTitles: string[] }>(path);
  if (existing?.exerciseTitles?.length) {
    const list = resolveExercisesByTitle(EXERCISES, existing.exerciseTitles);
    if (list.length > 0) {
      return { date, exercises: list };
    }
  }
  const titles = selectOnePerCategory(EXERCISES);
  await writeJson(path, { date, exerciseTitles: titles });
  return { date, exercises: resolveExercisesByTitle(EXERCISES, titles) };
}

export async function regenerateTodayExercises(date: string): Promise<void> {
  const path = dailyPath(date);
  await writeJson(path, { date, exerciseTitles: [] });
  revalidatePath("/exercises/daily-pick");
}

export async function getDailyPickHistory(): Promise<{ date: string; exercises: Exercise[] }[]> {
  const keys = await listBlobs("daily-");
  const entries = await Promise.all(
    keys.map(async (key) => {
      const dateMatch = key.match(/daily-(\d{4}-\d{2}-\d{2})\.json$/);
      if (!dateMatch) return null;
      const date = dateMatch[1];
      const data = await readJson<{ date: string; exerciseTitles: string[] }>(key);
      if (!data?.exerciseTitles?.length) return null;
      const exercises = resolveExercisesByTitle(EXERCISES, data.exerciseTitles);
      if (exercises.length === 0) return null;
      return { date, exercises };
    })
  );
  return entries
    .filter((e): e is { date: string; exercises: Exercise[] } => e !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPieces(): Promise<Piece[]> {
  const data = await readJson<Piece[]>(PIECES_PATH);
  return Array.isArray(data) ? data : [];
}

export async function getFamiliarPiecesDue(date: string): Promise<Piece[]> {
  const pieces = await getPieces();
  return _getFamiliarPiecesDue(pieces, date);
}

export async function getNewPiece(): Promise<Piece | null> {
  const pieces = await getPieces();
  return _getNewPiece(pieces);
}

export async function addPiece(formData: {
  title: string;
}): Promise<void> {
  const pieces = await getPieces();
  const now = new Date().toISOString();
  const piece: Piece = {
    id: crypto.randomUUID(),
    title: formData.title.trim(),
    proficiency: "new",
    lastPlayed: null,
    playCount: 0,
    troubleNotes: "",
    goalBpm: null,
    currentCleanBpm: null,
    createdAt: now,
  };
  pieces.push(piece);
  await writeJson(PIECES_PATH, pieces);
  revalidatePath("/pieces");
  revalidatePath("/sheet-music");
}

export async function updatePiece(
  id: string,
  updates: Partial<Pick<Piece, "title" | "proficiency" | "knowledge" | "troubleNotes" | "goalBpm" | "currentCleanBpm" | "youtubeUrl">>
): Promise<void> {
  const pieces = await getPieces();
  const i = pieces.findIndex((p) => p.id === id);
  if (i === -1) return;
  if (updates.title != null) pieces[i].title = updates.title.trim();
  if (updates.proficiency != null && PROFICIENCY_LEVELS.includes(updates.proficiency)) {
    pieces[i].proficiency = updates.proficiency;
  }
  if (updates.knowledge != null && KNOWLEDGE_LEVELS.includes(updates.knowledge)) {
    pieces[i].knowledge = updates.knowledge;
  }
  if (updates.troubleNotes != null) pieces[i].troubleNotes = updates.troubleNotes.trim();
  if (updates.goalBpm != null) pieces[i].goalBpm = updates.goalBpm;
  if (updates.currentCleanBpm != null) pieces[i].currentCleanBpm = updates.currentCleanBpm;
  if ("youtubeUrl" in updates) pieces[i].youtubeUrl = updates.youtubeUrl?.trim() || undefined;
  await writeJson(PIECES_PATH, pieces);
  revalidatePath("/pieces");
  revalidatePath("/sheet-music");
}

export async function recordPlay(id: string): Promise<void> {
  const pieces = await getPieces();
  const i = pieces.findIndex((p) => p.id === id);
  if (i === -1) return;
  const today = new Date().toISOString().slice(0, 10);
  pieces[i].lastPlayed = today;
  pieces[i].playCount += 1;
  await writeJson(PIECES_PATH, pieces);
  revalidatePath("/pieces");
  revalidatePath("/sheet-music");
}

export async function deletePiece(id: string): Promise<void> {
  const pieces = await getPieces();
  const filtered = pieces.filter((p) => p.id !== id);
  if (filtered.length === pieces.length) return;
  await writeJson(PIECES_PATH, filtered);
  revalidatePath("/pieces");
  revalidatePath("/sheet-music");
}

export async function uploadSheetMusic(
  pieceId: string,
  formData: FormData
): Promise<void> {
  const file = formData.get("pdf");
  if (!(file instanceof File)) return;
  if (file.size > 20 * 1024 * 1024) throw new Error("PDF must be 20 MB or smaller.");
  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadFile(`sheet-music/${pieceId}.pdf`, buffer, "application/pdf");
  const pieces = await getPieces();
  const i = pieces.findIndex((p) => p.id === pieceId);
  if (i !== -1) {
    pieces[i].hasSheetMusic = true;
    await writeJson(PIECES_PATH, pieces);
  }
  revalidatePath("/pieces");
}

export async function deleteSheetMusic(pieceId: string): Promise<void> {
  await deleteBlob(`sheet-music/${pieceId}.pdf`);
  const pieces = await getPieces();
  const i = pieces.findIndex((p) => p.id === pieceId);
  if (i !== -1) {
    pieces[i].hasSheetMusic = false;
    await writeJson(PIECES_PATH, pieces);
  }
  revalidatePath("/pieces");
}

const PLAYTIME_SESSIONS_PATH = "data/playtime-sessions.json";
const PLAYTIME_TARGET_PATH = "data/playtime-target.json";

export async function getPlayTarget(): Promise<number> {
  const data = await readJson<{ minutes: number }>(PLAYTIME_TARGET_PATH);
  return typeof data?.minutes === "number" ? data.minutes : 0;
}

export async function setPlayTarget(minutes: number): Promise<void> {
  await writeJson(PLAYTIME_TARGET_PATH, { minutes: Math.max(0, Math.floor(minutes)) });
  revalidatePath("/playtime");
}

export async function getPlaytimeSessions(): Promise<PlaytimeSession[]> {
  const data = await readJson<PlaytimeSession[]>(PLAYTIME_SESSIONS_PATH);
  return Array.isArray(data) ? data : [];
}

export async function getActivePlaytimeSession(): Promise<PlaytimeSession | null> {
  const sessions = await getPlaytimeSessions();
  return sessions.find((s) => s.endTime === null) ?? null;
}

export async function startPlaytimeSession(): Promise<void> {
  const sessions = await getPlaytimeSessions();
  // Stop any lingering active session first
  sessions.forEach((s) => {
    if (s.endTime === null) s.endTime = new Date().toISOString();
  });
  sessions.push({
    id: crypto.randomUUID(),
    startTime: new Date().toISOString(),
    endTime: null,
    pausedSince: null,
    totalPauseTime: 0,
  });
  await writeJson(PLAYTIME_SESSIONS_PATH, sessions);
  revalidatePath("/playtime");
}

export async function stopActivePlaytimeSession(): Promise<void> {
  const sessions = await getPlaytimeSessions();
  const active = sessions.find((s) => s.endTime === null);
  if (!active) return;
  // If stopped while paused, accumulate the final pause segment
  if (active.pausedSince) {
    active.totalPauseTime =
      (active.totalPauseTime ?? 0) +
      (Date.now() - new Date(active.pausedSince).getTime());
    active.pausedSince = null;
  }
  active.endTime = new Date().toISOString();
  await writeJson(PLAYTIME_SESSIONS_PATH, sessions);
  revalidatePath("/playtime");
}

export async function pauseActivePlaytimeSession(): Promise<void> {
  const sessions = await getPlaytimeSessions();
  const active = sessions.find((s) => s.endTime === null);
  if (!active || active.pausedSince) return;
  active.pausedSince = new Date().toISOString();
  await writeJson(PLAYTIME_SESSIONS_PATH, sessions);
  revalidatePath("/playtime");
}

export async function resumeActivePlaytimeSession(): Promise<void> {
  const sessions = await getPlaytimeSessions();
  const active = sessions.find((s) => s.endTime === null);
  if (!active || !active.pausedSince) return;
  active.totalPauseTime =
    (active.totalPauseTime ?? 0) +
    (Date.now() - new Date(active.pausedSince).getTime());
  active.pausedSince = null;
  await writeJson(PLAYTIME_SESSIONS_PATH, sessions);
  revalidatePath("/playtime");
}

export async function deletePlaytimeSession(id: string): Promise<void> {
  const sessions = await getPlaytimeSessions();
  const filtered = sessions.filter((s) => s.id !== id);
  if (filtered.length === sessions.length) return;
  await writeJson(PLAYTIME_SESSIONS_PATH, filtered);
  revalidatePath("/playtime");
}

export async function updatePlaytimeSession(
  id: string,
  updates: { startTime?: string; endTime?: string | null; totalPauseTime?: number }
): Promise<void> {
  const sessions = await getPlaytimeSessions();
  const i = sessions.findIndex((s) => s.id === id);
  if (i === -1) return;
  if (updates.startTime !== undefined) sessions[i].startTime = updates.startTime;
  if (updates.endTime !== undefined) sessions[i].endTime = updates.endTime;
  if (updates.totalPauseTime !== undefined) sessions[i].totalPauseTime = updates.totalPauseTime;
  await writeJson(PLAYTIME_SESSIONS_PATH, sessions);
  revalidatePath("/playtime");
}

export type { Exercise, Piece, Proficiency, PlaytimeSession };

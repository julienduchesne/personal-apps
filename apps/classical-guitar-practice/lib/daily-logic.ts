import type { Exercise, ExerciseCategory, Piece } from "./types";
import { EXERCISE_CATEGORIES, PROFICIENCY_INTERVAL_DAYS } from "./types";

export function resolveExercisesByTitle(
  allExercises: Exercise[],
  titles: string[]
): Exercise[] {
  const byTitle = new Map(allExercises.map((e) => [e.name, e]));
  return titles
    .map((t) => byTitle.get(t))
    .filter((e): e is Exercise => e != null);
}

export function selectOnePerCategory(
  allExercises: Exercise[],
  random: () => number = Math.random
): string[] {
  const byCategory = new Map<ExerciseCategory, Exercise[]>();
  for (const e of allExercises) {
    const list = byCategory.get(e.category) ?? [];
    list.push(e);
    byCategory.set(e.category, list);
  }
  const titles: string[] = [];
  for (const cat of EXERCISE_CATEGORIES) {
    const list = byCategory.get(cat) ?? [];
    if (list.length) {
      const pick = list[Math.floor(random() * list.length)];
      titles.push(pick.name);
    }
  }
  return titles;
}

export function nextDue(piece: Piece): string {
  if (!piece.lastPlayed) return new Date().toISOString().slice(0, 10);
  const interval = PROFICIENCY_INTERVAL_DAYS[piece.proficiency];
  const d = new Date(piece.lastPlayed);
  d.setDate(d.getDate() + interval);
  return d.toISOString().slice(0, 10);
}

export function getFamiliarPiecesDue(pieces: Piece[], date: string): Piece[] {
  const familiar = pieces.filter((p) => p.proficiency !== "new");
  const due = familiar.filter((p) => nextDue(p) <= date);
  due.sort((a, b) => nextDue(a).localeCompare(nextDue(b)));
  return due;
}

export function getNewPiece(pieces: Piece[]): Piece | null {
  const learning = pieces.filter(
    (p) =>
      p.proficiency === "new" ||
      p.proficiency === "learning" ||
      p.proficiency === "struggling"
  );
  if (learning.length === 0) return null;
  learning.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  return learning[0] ?? null;
}

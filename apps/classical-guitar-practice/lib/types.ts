export const EXERCISE_CATEGORIES = [
  "right_hand",
  "left_hand",
  "coordination_scales",
  "specialized",
] as const;
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export interface Exercise {
  name: string;
  category: ExerciseCategory;
  focus: string;
}

export const PROFICIENCY_LEVELS = [
  "new",
  "struggling",
  "learning",
  "comfortable",
  "very_proficient",
] as const;
export type Proficiency = (typeof PROFICIENCY_LEVELS)[number];

/** Days until next due by proficiency (for spaced repetition). */
export const PROFICIENCY_INTERVAL_DAYS: Record<Proficiency, number> = {
  new: 0,
  struggling: 2,
  learning: 5,
  comfortable: 7,
  very_proficient: 14,
};

export const KNOWLEDGE_LEVELS = [
  "none",
  "partial",
  "mostly",
  "by_heart",
] as const;
export type KnowledgeLevel = (typeof KNOWLEDGE_LEVELS)[number];

export interface Piece {
  id: string;
  title: string;
  proficiency: Proficiency;
  knowledge?: KnowledgeLevel;
  lastPlayed: string | null; // ISO date
  playCount: number;
  troubleNotes: string;
  goalBpm: number | null;
  currentCleanBpm: number | null;
  createdAt: string; // ISO
  hasSheetMusic?: boolean;
  youtubeUrl?: string;
}

export interface DailyExerciseSet {
  date: string; // YYYY-MM-DD
  exerciseTitles: string[];
}

export interface PlaytimeSession {
  id: string;
  startTime: string; // ISO datetime
  endTime: string | null; // null = in progress
  pausedSince: string | null; // ISO datetime when paused, null if running
  totalPauseTime: number; // accumulated pause duration in milliseconds
}

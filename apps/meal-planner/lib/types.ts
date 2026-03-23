export interface Recipe {
  id: string;
  name: string;
  description: string;
  prepTime: number;
  cookTimeLogs?: number[]; // logged actual cook times in minutes
  ingredients: string;
  tags: string[];
  sourceUrl?: string; // link to recipe online
  sourcePdfKey?: string; // S3 key for uploaded PDF
  createdAt: string;
}

/** Returns average of logged cook times, or prepTime as fallback. */
export function getEffectivePrepTime(recipe: Recipe): number {
  const logs = recipe.cookTimeLogs;
  if (!logs || logs.length === 0) return recipe.prepTime;
  return Math.round(logs.reduce((sum, t) => sum + t, 0) / logs.length);
}

export interface DaySchedule {
  dayOfWeek: number; // 0=Monday .. 6=Sunday
  cookingTime: number; // minutes
}

export interface TagLimit {
  tag: string;
  maxPerWeek: number;
}

export interface MealLog {
  id: string;
  date: string; // YYYY-MM-DD
  recipeId: string | null;
  freeText: string | null;
}

export interface Suggestion {
  recipe: Recipe;
  score: number;
  reasons: string[];
}

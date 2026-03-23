export interface Recipe {
  id: string;
  name: string;
  description: string;
  prepTime: number;
  ingredients: string;
  tags: string[];
  sourceUrl?: string; // link to recipe online
  sourcePdfKey?: string; // S3 key for uploaded PDF
  createdAt: string;
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

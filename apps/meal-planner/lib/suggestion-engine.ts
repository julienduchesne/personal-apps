import { Recipe, DaySchedule, TagLimit, MealLog, Suggestion } from "./types";
import { getDayOfWeek, daysBetween, today } from "./date-utils";

/**
 * Simple seeded random number generator (mulberry32).
 */
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h |= 0;
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSuggestions(
  date: string,
  allRecipes: Recipe[],
  schedule: DaySchedule[],
  tagLimits: TagLimit[],
  recentMeals: MealLog[],
  weekMeals: MealLog[]
): Suggestion[] {
  if (allRecipes.length === 0) return [];

  const dayOfWeek = getDayOfWeek(date);
  const daySchedule = schedule.find((s) => s.dayOfWeek === dayOfWeek);
  const cookingTime = daySchedule?.cookingTime ?? 30;

  // If no cooking time, no suggestions
  if (cookingTime === 0) return [];

  // Step 1: Filter by time budget
  let candidates = allRecipes.filter((r) => r.prepTime <= cookingTime);

  // Step 2: Filter by tag limits
  const weekTagCounts = new Map<string, number>();
  for (const meal of weekMeals) {
    if (meal.recipeId) {
      const recipe = allRecipes.find((r) => r.id === meal.recipeId);
      if (recipe) {
        for (const tag of recipe.tags) {
          weekTagCounts.set(tag, (weekTagCounts.get(tag) ?? 0) + 1);
        }
      }
    }
  }

  candidates = candidates.filter((recipe) => {
    for (const tag of recipe.tags) {
      const limit = tagLimits.find((l) => l.tag === tag);
      if (limit) {
        const current = weekTagCounts.get(tag) ?? 0;
        if (current >= limit.maxPerWeek) return false;
      }
    }
    return true;
  });

  if (candidates.length === 0) return [];

  // Step 3: Score remaining candidates
  const todayStr = today();
  const rand = seededRandom(date);

  const scored: Suggestion[] = candidates.map((recipe) => {
    const reasons: string[] = [];

    // Recency score (0-40)
    const lastCooked = recentMeals
      .filter((m) => m.recipeId === recipe.id)
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    let recencyScore: number;
    if (!lastCooked) {
      recencyScore = 40;
      reasons.push("Never cooked before");
    } else {
      const days = daysBetween(lastCooked.date, todayStr);
      recencyScore = Math.min(40, Math.max(0, days * 2));
      if (days > 7) {
        reasons.push(`Last cooked ${days} days ago`);
      }
    }

    // Tag variety score (0-30)
    const recipeTags = new Set(recipe.tags);
    let overlapping = 0;
    for (const tag of recipeTags) {
      if (weekTagCounts.has(tag)) overlapping++;
    }
    const varietyScore =
      recipeTags.size > 0 ? 30 * (1 - overlapping / recipeTags.size) : 15;
    if (overlapping === 0 && recipeTags.size > 0) {
      reasons.push("Adds variety to the week");
    }

    // Time fit score (0-15)
    const timeFitScore = cookingTime > 0 ? 15 * (recipe.prepTime / cookingTime) : 0;
    reasons.push(`Fits ${cookingTime}min budget (${recipe.prepTime}min)`);

    // Pick rate score (0-20): timesChosen / daysInRotation
    const daysInRotation = Math.max(1, daysBetween(recipe.createdAt.slice(0, 10), todayStr));
    const timesChosen = recentMeals.filter((m) => m.recipeId === recipe.id).length;
    const pickRate = timesChosen / daysInRotation;
    // Normalize: a recipe cooked ~once per week (1/7 ≈ 0.14) scores ~15/20
    const ratingScore = Math.min(20, pickRate * 105);
    if (timesChosen > 0) {
      reasons.push(`Cooked ${timesChosen}× in ${daysInRotation}d`);
    }

    // Random jitter (0-15)
    const jitterScore = rand() * 15;

    const score = recencyScore + varietyScore + timeFitScore + ratingScore + jitterScore;

    return { recipe, score, reasons };
  });

  // Step 4: Sort and return top 5
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5);
}

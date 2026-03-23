"use server";

import { getRecipes } from "./recipes";
import { getWeeklySchedule, getTagLimits } from "./schedule";
import { getMealLogsForWeek, getRecentMealHistory } from "./meals";
import { generateSuggestions } from "@/lib/suggestion-engine";
import { getWeekStart, getWeekDates } from "@/lib/date-utils";
import { Suggestion } from "@/lib/types";

export async function getSuggestionsForDate(date: string): Promise<Suggestion[]> {
  const [recipes, schedule, tagLimits, recentMeals, weekMeals] = await Promise.all([
    getRecipes(),
    getWeeklySchedule(),
    getTagLimits(),
    getRecentMealHistory(60),
    getMealLogsForWeek(getWeekStart(date)),
  ]);

  return generateSuggestions(date, recipes, schedule, tagLimits, recentMeals, weekMeals);
}

export async function getSuggestionsForWeek(
  weekStart: string
): Promise<Record<string, Suggestion[]>> {
  const [recipes, schedule, tagLimits, recentMeals, weekMeals] = await Promise.all([
    getRecipes(),
    getWeeklySchedule(),
    getTagLimits(),
    getRecentMealHistory(60),
    getMealLogsForWeek(weekStart),
  ]);

  const dates = getWeekDates(weekStart);
  const result: Record<string, Suggestion[]> = {};

  for (const date of dates) {
    result[date] = generateSuggestions(
      date,
      recipes,
      schedule,
      tagLimits,
      recentMeals,
      weekMeals
    );
  }

  return result;
}

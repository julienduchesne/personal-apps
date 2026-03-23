"use server";

import { readJson, writeJson } from "@repo/storage";
import { MealLog, Recipe } from "@/lib/types";
import { daysBetween, today } from "@/lib/date-utils";
import { revalidatePath } from "next/cache";
import { createRecipe } from "./recipes";

const FILE = "meal-log.json";

export async function getMealLogs(): Promise<MealLog[]> {
  return (await readJson<MealLog[]>(FILE)) ?? [];
}

export async function getMealLogsForWeek(weekStart: string): Promise<MealLog[]> {
  const all = await getMealLogs();
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return all.filter((m) => {
    const d = new Date(m.date + "T00:00:00");
    return d >= start && d < end;
  });
}

export async function logMeal(
  date: string,
  recipeId: string | null,
  freeText: string | null
): Promise<void> {
  const all = await getMealLogs();
  const existing = all.findIndex((m) => m.date === date);
  const entry: MealLog = {
    id: crypto.randomUUID(),
    date,
    recipeId,
    freeText,
  };

  if (existing >= 0) {
    all[existing] = entry;
  } else {
    all.push(entry);
  }

  await writeJson(FILE, all);
  revalidatePath("/week");
}

export async function deleteMealLog(date: string): Promise<void> {
  const all = await getMealLogs();
  await writeJson(
    FILE,
    all.filter((m) => m.date !== date)
  );
  revalidatePath("/week");
}

export async function logAdHocMeal(date: string, name: string): Promise<void> {
  const recipe = await createRecipe({
    name,
    description: "",
    prepTime: 0,
    ingredients: "",
    tags: [],
  });
  await logMeal(date, recipe.id, null);
}

export async function getRecentMealHistory(days: number = 60): Promise<MealLog[]> {
  const all = await getMealLogs();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  return all.filter((m) => m.date >= cutoffStr);
}

export interface PickRateInfo {
  timesChosen: number;
  daysInRotation: number;
}

export async function getPickRates(recipes: Recipe[]): Promise<Record<string, PickRateInfo>> {
  const allMeals = await getMealLogs();
  const todayStr = today();
  const result: Record<string, PickRateInfo> = {};

  for (const recipe of recipes) {
    const timesChosen = allMeals.filter((m) => m.recipeId === recipe.id).length;
    const daysInRotation = Math.max(1, daysBetween(recipe.createdAt.slice(0, 10), todayStr));
    result[recipe.id] = { timesChosen, daysInRotation };
  }

  return result;
}

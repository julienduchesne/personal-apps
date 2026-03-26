"use server";

import { readJson, writeJson } from "@repo/storage";
import { Snooze } from "@/lib/types";
import { today } from "@/lib/date-utils";
import { revalidatePath } from "next/cache";

const FILE = "snoozes.json";

export async function getSnoozes(): Promise<Snooze[]> {
  return (await readJson<Snooze[]>(FILE)) ?? [];
}

export async function getActiveSnoozes(): Promise<Snooze[]> {
  const all = await getSnoozes();
  const todayStr = today();
  return all.filter((s) => s.until >= todayStr);
}

export async function snoozeRecipe(
  recipeId: string,
  until: string,
  reason: string
): Promise<void> {
  const all = await getSnoozes();
  // Remove any existing snooze for this recipe
  const filtered = all.filter((s) => s.recipeId !== recipeId);
  filtered.push({
    id: crypto.randomUUID(),
    recipeId,
    reason,
    until,
  });
  await writeJson(FILE, filtered);
  revalidatePath("/week");
}

export async function unsnoozeRecipe(recipeId: string): Promise<void> {
  const all = await getSnoozes();
  await writeJson(
    FILE,
    all.filter((s) => s.recipeId !== recipeId)
  );
  revalidatePath("/week");
}

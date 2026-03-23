"use server";

import { readJson, writeJson } from "@repo/storage";
import { DaySchedule, TagLimit } from "@/lib/types";
import { revalidatePath } from "next/cache";

const SCHEDULE_FILE = "weekly-schedule.json";
const TAG_LIMITS_FILE = "tag-limits.json";

const DEFAULT_SCHEDULE: DaySchedule[] = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  cookingTime: 30,
}));

export async function getWeeklySchedule(): Promise<DaySchedule[]> {
  const schedule = await readJson<DaySchedule[]>(SCHEDULE_FILE);
  if (!schedule) {
    await writeJson(SCHEDULE_FILE, DEFAULT_SCHEDULE);
    return DEFAULT_SCHEDULE;
  }
  return schedule;
}

export async function updateDaySchedule(dayOfWeek: number, cookingTime: number): Promise<void> {
  const schedule = await getWeeklySchedule();
  const idx = schedule.findIndex((s) => s.dayOfWeek === dayOfWeek);
  if (idx >= 0) {
    schedule[idx].cookingTime = cookingTime;
  }
  await writeJson(SCHEDULE_FILE, schedule);
  revalidatePath("/settings");
  revalidatePath("/week");
}

export async function getTagLimits(): Promise<TagLimit[]> {
  return (await readJson<TagLimit[]>(TAG_LIMITS_FILE)) ?? [];
}

export async function upsertTagLimit(tag: string, maxPerWeek: number): Promise<void> {
  const limits = await getTagLimits();
  const idx = limits.findIndex((l) => l.tag === tag);
  if (idx >= 0) {
    limits[idx].maxPerWeek = maxPerWeek;
  } else {
    limits.push({ tag, maxPerWeek });
  }
  await writeJson(TAG_LIMITS_FILE, limits);
  revalidatePath("/settings");
  revalidatePath("/week");
}

export async function deleteTagLimit(tag: string): Promise<void> {
  const limits = await getTagLimits();
  await writeJson(
    TAG_LIMITS_FILE,
    limits.filter((l) => l.tag !== tag)
  );
  revalidatePath("/settings");
  revalidatePath("/week");
}

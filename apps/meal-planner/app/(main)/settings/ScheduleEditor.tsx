"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { DaySchedule } from "@/lib/types";
import { getDayName } from "@/lib/date-utils";
import { updateDaySchedule } from "@/app/actions/schedule";
import { Slider } from "@/components/ui/slider";

const DEBOUNCE_MS = 500;

export function ScheduleEditor({ schedule }: { schedule: DaySchedule[] }) {
  const [local, setLocal] = useState(schedule);
  const [pending, startTransition] = useTransition();
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const handleChange = useCallback((dayOfWeek: number, cookingTime: number) => {
    setLocal((prev) =>
      prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, cookingTime } : s))
    );

    const existing = timers.current.get(dayOfWeek);
    if (existing) clearTimeout(existing);

    timers.current.set(
      dayOfWeek,
      setTimeout(() => {
        timers.current.delete(dayOfWeek);
        startTransition(() => {
          updateDaySchedule(dayOfWeek, cookingTime);
        });
      }, DEBOUNCE_MS)
    );
  }, []);

  return (
    <div className="space-y-3">
      {local.map((day) => (
        <div
          key={day.dayOfWeek}
          className="flex items-center gap-4 bg-card rounded-xl p-3 border border-border"
        >
          <span className="w-24 text-sm font-medium text-foreground/90">
            {getDayName(day.dayOfWeek)}
          </span>
          <Slider
            min={0}
            max={120}
            step={5}
            value={[day.cookingTime]}
            onValueChange={(v) => handleChange(day.dayOfWeek, Array.isArray(v) ? v[0] : v)}
            className="flex-1"
          />
          <span className="w-16 text-right text-sm text-secondary-foreground tabular-nums">
            {day.cookingTime === 0 ? "Off" : `${day.cookingTime}m`}
          </span>
        </div>
      ))}
      {pending && (
        <p className="text-xs text-muted-foreground">Saving...</p>
      )}
    </div>
  );
}

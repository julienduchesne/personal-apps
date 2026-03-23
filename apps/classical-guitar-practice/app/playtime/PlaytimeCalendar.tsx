"use client";

import { useState, useTransition } from "react";
import type { PlaytimeSession } from "@/lib/types";
import { setPlayTarget } from "@/app/actions";
import styles from "./Playtime.module.css";

function getLocalDateKey(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildDayTotals(sessions: PlaytimeSession[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const session of sessions) {
    if (!session.endTime) continue;
    const ms =
      new Date(session.endTime).getTime() -
      new Date(session.startTime).getTime() -
      (session.totalPauseTime ?? 0);
    if (ms <= 0) continue;
    const key = getLocalDateKey(session.startTime);
    totals.set(key, (totals.get(key) ?? 0) + ms);
  }
  return totals;
}

function formatDayDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
  return `${minutes}m`;
}

/** Returns a red→green background color based on ratio of practice to target.
 * 0–75% of target: red→yellow (hue 0→60)
 * 75–100% of target: yellow→green (hue 60→120), full green only at target */
function dayColor(ms: number, targetMs: number): string {
  if (targetMs <= 0) return "hsl(120, 55%, 87%)";
  const ratio = Math.min(1, ms / targetMs);
  let hue: number;
  if (ratio <= 0.75) {
    hue = Math.round((ratio / 0.75) * 60); // 0 → 60 (red → yellow)
  } else {
    hue = Math.round(60 + ((ratio - 0.75) / 0.25) * 60); // 60 → 120 (yellow → green)
  }
  return `hsl(${hue}, 60%, 87%)`;
}

export function PlaytimeCalendar({
  sessions,
  playTarget,
}: {
  sessions: PlaytimeSession[];
  playTarget: number;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [targetMinutes, setTargetMinutes] = useState(playTarget);
  const [, startTransition] = useTransition();

  const dayTotals = buildDayTotals(sessions);
  const targetMs = targetMinutes * 60000;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = getLocalDateKey(today.toISOString());

  function prev() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }

  function next() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  function saveTarget(value: number) {
    const clamped = Math.max(0, Math.floor(value));
    setTargetMinutes(clamped);
    startTransition(async () => {
      await setPlayTarget(clamped);
    });
  }

  const monthLabel = new Date(year, month, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className={styles.calendar}>
      <div className={styles.calendarHeader}>
        <button type="button" onClick={prev} className={styles.calendarNav} aria-label="Previous month">
          ‹
        </button>
        <span className={styles.calendarMonth}>{monthLabel}</span>
        <button type="button" onClick={next} className={styles.calendarNav} aria-label="Next month">
          ›
        </button>
      </div>
      <div className={styles.calendarTarget}>
        <label htmlFor="playTarget" className={styles.calendarTargetLabel}>
          Daily target
        </label>
        <input
          id="playTarget"
          type="number"
          min={0}
          value={targetMinutes}
          className={styles.calendarTargetInput}
          onChange={(e) => setTargetMinutes(Number(e.target.value))}
          onBlur={(e) => saveTarget(Number(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveTarget(Number((e.target as HTMLInputElement).value));
          }}
        />
        <span className={styles.calendarTargetUnit}>min</span>
      </div>
      <div className={styles.calendarGrid}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className={styles.calendarDayHeader}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const ms = dayTotals.get(key);
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              className={[
                styles.calendarCell,
                isToday ? styles.calendarToday : "",
              ].filter(Boolean).join(" ")}
              style={ms ? { backgroundColor: dayColor(ms, targetMs) } : undefined}
            >
              <span className={styles.calendarDayNum}>{day}</span>
              {ms ? <span className={styles.calendarTime}>{formatDayDuration(ms)}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

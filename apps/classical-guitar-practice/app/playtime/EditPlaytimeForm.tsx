"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePlaytimeSession } from "@/app/actions";
import { Link } from "@/components/Link";
import type { PlaytimeSession } from "@/lib/types";
import styles from "./Playtime.module.css";

/** Convert UTC ISO string to datetime-local input value in local time (with seconds). */
function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export function EditPlaytimeForm({ session }: { session: PlaytimeSession }) {
  const [startTime, setStartTime] = useState(() =>
    toLocalDatetimeValue(session.startTime)
  );
  const [endTime, setEndTime] = useState(() =>
    session.endTime ? toLocalDatetimeValue(session.endTime) : ""
  );
  const totalMs = session.totalPauseTime ?? 0;
  const [pausedMinutes, setPausedMinutes] = useState(() =>
    Math.floor(totalMs / 60000)
  );
  const [pausedSeconds, setPausedSeconds] = useState(() =>
    Math.floor((totalMs % 60000) / 1000)
  );
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await updatePlaytimeSession(session.id, {
        startTime: new Date(startTime).toISOString(),
        endTime: endTime ? new Date(endTime).toISOString() : null,
        totalPauseTime: pausedMinutes * 60000 + pausedSeconds * 1000,
      });
      router.push("/playtime");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="startTime">Start time</label>
        <input
          id="startTime"
          type="datetime-local"
          step="1"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="endTime">End time (leave blank if in progress)</label>
        <input
          id="endTime"
          type="datetime-local"
          step="1"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label>Paused time</label>
        <div className={styles.pauseInputs}>
          <input
            id="pausedMinutes"
            type="number"
            min={0}
            value={pausedMinutes}
            onChange={(e) => setPausedMinutes(Number(e.target.value))}
            aria-label="Paused minutes"
          />
          <span className={styles.pauseSep}>m</span>
          <input
            id="pausedSeconds"
            type="number"
            min={0}
            max={59}
            value={pausedSeconds}
            onChange={(e) => setPausedSeconds(Number(e.target.value))}
            aria-label="Paused seconds"
          />
          <span className={styles.pauseSep}>s</span>
        </div>
      </div>
      <div className={styles.formActions}>
        <button type="submit" className={styles.saveButton} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <Link href="/playtime" className={styles.cancelLink}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

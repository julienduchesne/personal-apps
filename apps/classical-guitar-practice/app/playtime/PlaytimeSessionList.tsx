"use client";

import type { PlaytimeSession } from "@/lib/types";
import { Link } from "@/components/Link";
import { DeletePlaytimeButton } from "./DeletePlaytimeButton";
import styles from "./Playtime.module.css";

function formatLocalDisplay(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatDuration(session: PlaytimeSession): string {
  if (!session.endTime) return "";
  const ms =
    new Date(session.endTime).getTime() -
    new Date(session.startTime).getTime() -
    (session.totalPauseTime ?? 0);
  const totalMinutes = Math.floor(Math.max(0, ms) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function PlaytimeSessionList({ sessions }: { sessions: PlaytimeSession[] }) {
  const sorted = [...sessions].sort((a, b) =>
    b.startTime.localeCompare(a.startTime)
  );

  if (sorted.length === 0) {
    return (
      <p className={styles.empty}>
        No sessions yet. Use the &ldquo;Start Session&rdquo; button in the
        menu to begin tracking.
      </p>
    );
  }

  return (
    <ul className={styles.list}>
      {sorted.map((session) => (
        <li
          key={session.id}
          className={`${styles.entry} ${session.endTime === null ? styles.entryActive : ""}`}
        >
          <div className={styles.entryHeader}>
            <div className={styles.times}>
              <span className={styles.timeRow}>
                <span className={styles.timeLabel}>Started</span>
                <span className={styles.timeValue}>
                  {formatLocalDisplay(session.startTime)}
                </span>
              </span>
              {session.endTime !== null ? (
                <>
                  <span className={styles.timeRow}>
                    <span className={styles.timeLabel}>Ended</span>
                    <span className={styles.timeValue}>
                      {formatLocalDisplay(session.endTime)}
                    </span>
                  </span>
                  <span className={styles.duration}>
                    {formatDuration(session)}
                  </span>
                </>
              ) : (
                <span className={styles.badge}>
                  {session.pausedSince ? "Paused" : "In progress"}
                </span>
              )}
            </div>
            <div className={styles.actions}>
              <Link
                href={`/playtime?edit=${session.id}`}
                className={styles.editButton}
              >
                Edit
              </Link>
              <DeletePlaytimeButton id={session.id} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

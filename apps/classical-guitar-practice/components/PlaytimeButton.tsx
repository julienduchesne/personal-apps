"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  startPlaytimeSession,
  stopActivePlaytimeSession,
  pauseActivePlaytimeSession,
  resumeActivePlaytimeSession,
} from "@/app/actions";
import styles from "./Sidebar.module.css";
import type { PlaytimeSession } from "@/lib/types";

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function PlaytimeButton({
  activeSession: serverActiveSession,
}: {
  activeSession: PlaytimeSession | null;
}) {
  const [activeStartTime, setActiveStartTime] = useState(
    serverActiveSession?.startTime ?? null
  );
  const [pausedSince, setPausedSince] = useState(
    serverActiveSession?.pausedSince ?? null
  );
  const [totalPauseTime, setTotalPauseTime] = useState(
    serverActiveSession?.totalPauseTime ?? 0
  );
  const [elapsed, setElapsed] = useState(0);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isActive = activeStartTime !== null;
  const isPaused = pausedSince !== null;

  // Sync with server prop when it changes (e.g. after router.refresh())
  // Only sync timestamps on initial load (session === null locally) to avoid
  // display jumps caused by mixing client and server clock domains.
  // totalPauseTime is a duration computed from server-side timestamps only,
  // so it is safe to sync and does not introduce clock-skew artefacts.
  useEffect(() => {
    if (!serverActiveSession) {
      setActiveStartTime(null);
      setPausedSince(null);
      setTotalPauseTime(0);
    } else {
      setTotalPauseTime(serverActiveSession.totalPauseTime ?? 0);
    }
  }, [serverActiveSession]);

  // Run elapsed timer while active
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!activeStartTime) {
      setElapsed(0);
      return;
    }

    const startMs = new Date(activeStartTime).getTime();
    const paused = totalPauseTime ?? 0;

    const computeElapsed = () => {
      if (pausedSince) {
        // Frozen at the moment pause started
        const pauseStartMs = new Date(pausedSince).getTime();
        return Math.max(0, Math.floor((pauseStartMs - startMs - paused) / 1000));
      }
      return Math.max(0, Math.floor((Date.now() - startMs - paused) / 1000));
    };

    setElapsed(computeElapsed());

    if (pausedSince) return; // don't tick while paused

    intervalRef.current = setInterval(() => setElapsed(computeElapsed()), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeStartTime, pausedSince, totalPauseTime]);

  function handleStart() {
    setActiveStartTime(new Date().toISOString());
    setPausedSince(null);
    setTotalPauseTime(0);
    startTransition(async () => {
      await startPlaytimeSession();
      router.refresh();
    });
  }

  function handleStop() {
    setActiveStartTime(null);
    setPausedSince(null);
    setTotalPauseTime(0);
    startTransition(async () => {
      await stopActivePlaytimeSession();
      router.refresh();
    });
  }

  function handlePause() {
    setPausedSince(new Date().toISOString());
    startTransition(async () => {
      await pauseActivePlaytimeSession();
      router.refresh();
    });
  }

  function handleResume() {
    const pauseMs = pausedSince
      ? Date.now() - new Date(pausedSince).getTime()
      : 0;
    setTotalPauseTime((prev) => prev + pauseMs);
    setPausedSince(null);
    startTransition(async () => {
      await resumeActivePlaytimeSession();
      router.refresh();
    });
  }

  if (!isActive) {
    return (
      <button
        type="button"
        className={styles.playtimeButton}
        disabled={pending}
        onClick={handleStart}
      >
        {pending ? "…" : "▶ Start Session"}
      </button>
    );
  }

  return (
    <div className={styles.playtimeButtonRow}>
      <button
        type="button"
        className={`${styles.playtimeButton} ${isPaused ? styles.playtimeButtonResume : ""}`}
        disabled={pending}
        onClick={isPaused ? handleResume : handlePause}
      >
        {isPaused ? "▶ Resume" : "⏸ Pause"}
      </button>
      <button
        type="button"
        className={`${styles.playtimeButton} ${styles.playtimeButtonActive}`}
        disabled={pending}
        onClick={handleStop}
      >
        ⏹ {formatElapsed(elapsed)}
      </button>
    </div>
  );
}

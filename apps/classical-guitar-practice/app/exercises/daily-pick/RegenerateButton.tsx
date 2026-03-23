"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { regenerateTodayExercises } from "@/app/actions";
import styles from "./DailyPick.module.css";

export function RegenerateButton({ date }: { date: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await regenerateTodayExercises(date);
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={styles.regenerateButton}
    >
      {loading ? "Regenerating…" : "Regenerate"}
    </button>
  );
}

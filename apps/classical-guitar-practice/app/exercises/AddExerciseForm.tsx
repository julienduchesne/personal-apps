"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addExercise } from "@/app/actions";
import type { ExerciseCategory } from "@/lib/types";
import { EXERCISE_CATEGORIES } from "@/lib/types";
import styles from "./Exercises.module.css";

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  right_hand: "Right Hand",
  left_hand: "Left Hand",
  coordination_scales: "Coordination & Scales",
  specialized: "Specialized",
};

export function AddExerciseForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("add-name") as HTMLInputElement).value;
    const category = (form.elements.namedItem("add-category") as HTMLSelectElement)
      .value as ExerciseCategory;
    const focus = (form.elements.namedItem("add-focus") as HTMLInputElement).value;
    if (!name.trim()) return;
    setLoading(true);
    await addExercise({ name: name.trim(), category, focus: focus.trim() });
    router.push("/exercises");
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="add-name">Name</label>
        <input id="add-name" name="add-name" required />
      </div>
      <div className={styles.field}>
        <label htmlFor="add-category">Category</label>
        <select id="add-category" name="add-category" defaultValue="right_hand">
          {EXERCISE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor="add-focus">Focus</label>
        <input id="add-focus" name="add-focus" placeholder="What this exercise targets" />
      </div>
      <button type="submit" disabled={loading} className={styles.primaryButton}>
        {loading ? "Adding\u2026" : "Add exercise"}
      </button>
    </form>
  );
}

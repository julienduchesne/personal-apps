"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateExercise, deleteExercise, deleteExerciseSheetMusic } from "@/app/actions";
import type { Exercise, ExerciseCategory } from "@/lib/types";
import { EXERCISE_CATEGORIES } from "@/lib/types";
import { Link } from "@/components/Link";
import styles from "./Exercises.module.css";

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  right_hand: "Right Hand",
  left_hand: "Left Hand",
  coordination_scales: "Coordination & Scales",
  specialized: "Specialized",
};

export function EditExerciseForm({ exercise }: { exercise: Exercise }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deletePdfPending, startDeletePdf] = useTransition();
  const [deleteExPending, startDeleteEx] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("edit-name") as HTMLInputElement).value;
    const category = (form.elements.namedItem("edit-category") as HTMLSelectElement)
      .value as ExerciseCategory;
    const focus = (form.elements.namedItem("edit-focus") as HTMLInputElement).value;
    const youtubeUrl = (form.elements.namedItem("edit-youtubeUrl") as HTMLInputElement).value;
    setLoading(true);
    await updateExercise(exercise.id, { name, category, focus, youtubeUrl });
    router.push("/exercises");
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="edit-name">Name</label>
        <input
          id="edit-name"
          name="edit-name"
          defaultValue={exercise.name}
          required
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="edit-category">Category</label>
        <select
          id="edit-category"
          name="edit-category"
          defaultValue={exercise.category}
        >
          {EXERCISE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor="edit-focus">Focus</label>
        <input
          id="edit-focus"
          name="edit-focus"
          defaultValue={exercise.focus}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="edit-youtubeUrl">YouTube URL</label>
        <input
          id="edit-youtubeUrl"
          name="edit-youtubeUrl"
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          defaultValue={exercise.youtubeUrl ?? ""}
        />
      </div>
      {exercise.hasSheetMusic && (
        <div className={styles.field}>
          <label>Sheet music</label>
          <div>
            <button
              type="button"
              disabled={deletePdfPending}
              className={styles.sheetMusicDelete}
              onClick={() => {
                startDeletePdf(async () => {
                  await deleteExerciseSheetMusic(exercise.id);
                  router.refresh();
                });
              }}
            >
              {deletePdfPending ? "Deleting\u2026" : "Delete PDF"}
            </button>
          </div>
        </div>
      )}
      <div className={styles.buttonRow}>
        <button type="submit" disabled={loading} className={styles.primaryButton}>
          {loading ? "Saving\u2026" : "Save"}
        </button>
        <Link href="/exercises" className={styles.cancelLink}>
          Cancel
        </Link>
        <button
          type="button"
          disabled={deleteExPending}
          className={styles.deleteButton}
          onClick={() => {
            if (!confirm(`Delete "${exercise.name}"?`)) return;
            startDeleteEx(async () => {
              await deleteExercise(exercise.id);
              router.push("/exercises");
            });
          }}
        >
          {deleteExPending ? "Deleting\u2026" : "Delete"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updatePiece, deleteSheetMusic } from "@/app/actions";
import type { Piece, Proficiency, KnowledgeLevel } from "@/lib/types";
import { PROFICIENCY_LEVELS, KNOWLEDGE_LEVELS } from "@/lib/types";
import { Link } from "@/components/Link";
import styles from "./Pieces.module.css";

const PROFICIENCY_LABELS: Record<Proficiency, string> = {
  new: "New",
  struggling: "Struggling",
  learning: "Learning",
  comfortable: "Comfortable",
  very_proficient: "Very proficient",
};

const KNOWLEDGE_LABELS: Record<KnowledgeLevel, string> = {
  none: "None",
  partial: "Partial",
  mostly: "Mostly",
  by_heart: "By heart",
};

export function EditPieceForm({ piece }: { piece: Piece }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deletePdfPending, startDeletePdf] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const title = (form.elements.namedItem("edit-title") as HTMLInputElement).value;
    const proficiency = (form.elements.namedItem("edit-proficiency") as HTMLSelectElement)
      .value as Proficiency;
    const knowledge = (form.elements.namedItem("edit-knowledge") as HTMLSelectElement)
      .value as KnowledgeLevel;
    const troubleNotes = (form.elements.namedItem("edit-troubleNotes") as HTMLTextAreaElement).value;
    const goalBpmRaw = (form.elements.namedItem("edit-goalBpm") as HTMLInputElement).value;
    const currentCleanBpmRaw = (form.elements.namedItem("edit-currentCleanBpm") as HTMLInputElement)
      .value;
    const youtubeUrl = (form.elements.namedItem("edit-youtubeUrl") as HTMLInputElement).value;
    const goalBpm = goalBpmRaw ? Number(goalBpmRaw) : null;
    const currentCleanBpm = currentCleanBpmRaw ? Number(currentCleanBpmRaw) : null;
    setLoading(true);
    await updatePiece(piece.id, {
      title: title.trim(),
      proficiency,
      knowledge,
      troubleNotes: troubleNotes.trim(),
      goalBpm,
      currentCleanBpm,
      youtubeUrl,
    });
    router.push("/pieces");
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="edit-title">Title</label>
        <input
          id="edit-title"
          name="edit-title"
          defaultValue={piece.title}
          required
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="edit-proficiency">Playing level</label>
        <select
          id="edit-proficiency"
          name="edit-proficiency"
          defaultValue={piece.proficiency}
        >
          {PROFICIENCY_LEVELS.map((p) => (
            <option key={p} value={p}>
              {PROFICIENCY_LABELS[p]}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor="edit-knowledge">Knowledge (memorization)</label>
        <select
          id="edit-knowledge"
          name="edit-knowledge"
          defaultValue={piece.knowledge ?? "none"}
        >
          {KNOWLEDGE_LEVELS.map((k) => (
            <option key={k} value={k}>
              {KNOWLEDGE_LABELS[k]}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor="edit-troubleNotes">Trouble notes (Wall of Pain)</label>
        <textarea
          id="edit-troubleNotes"
          name="edit-troubleNotes"
          defaultValue={piece.troubleNotes}
          rows={3}
        />
      </div>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor="edit-goalBpm">Goal BPM</label>
          <input
            id="edit-goalBpm"
            name="edit-goalBpm"
            type="number"
            min={1}
            defaultValue={piece.goalBpm ?? ""}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="edit-currentCleanBpm">Current clean BPM</label>
          <input
            id="edit-currentCleanBpm"
            name="edit-currentCleanBpm"
            type="number"
            min={1}
            defaultValue={piece.currentCleanBpm ?? ""}
          />
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor="edit-youtubeUrl">YouTube URL</label>
        <input
          id="edit-youtubeUrl"
          name="edit-youtubeUrl"
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          defaultValue={piece.youtubeUrl ?? ""}
        />
      </div>
      {piece.hasSheetMusic && (
        <div className={styles.field}>
          <label>Sheet music</label>
          <div>
            <button
              type="button"
              disabled={deletePdfPending}
              className={styles.sheetMusicDelete}
              onClick={() => {
                startDeletePdf(async () => {
                  await deleteSheetMusic(piece.id);
                  router.refresh();
                });
              }}
            >
              {deletePdfPending ? "Deleting…" : "Delete PDF"}
            </button>
          </div>
        </div>
      )}
      <div className={styles.buttonRow}>
        <button type="submit" disabled={loading} className={styles.primaryButton}>
          {loading ? "Saving…" : "Save"}
        </button>
        <Link href="/pieces" className={styles.cancelLink}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

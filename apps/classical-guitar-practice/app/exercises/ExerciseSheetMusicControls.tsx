"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadExerciseSheetMusic } from "@/app/actions";
import styles from "./Exercises.module.css";

const MAX_MB = 20;

export function ExerciseSheetMusicControls({
  exerciseId,
  hasSheetMusic,
}: {
  exerciseId: string;
  hasSheetMusic: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadPending, startUpload] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.type !== "application/pdf") {
      setError("Only PDF files are accepted.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File exceeds ${MAX_MB} MB limit.`);
      e.target.value = "";
      return;
    }
    const fd = new FormData();
    fd.append("pdf", file);
    startUpload(async () => {
      try {
        await uploadExerciseSheetMusic(exerciseId, fd);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  }

  return (
    <span className={styles.sheetMusicControls}>
      {hasSheetMusic ? (
        <a
          href={`/api/exercises/${exerciseId}/sheet-music`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.sheetMusicLink}
        >
          View PDF
        </a>
      ) : (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadPending}
            className={styles.sheetMusicUpload}
          >
            {uploadPending ? "Uploading\u2026" : "Upload PDF"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className={styles.hiddenFileInput}
            onChange={handleFileChange}
            aria-label="Upload exercise sheet music PDF"
          />
        </>
      )}
      {error && <span className={styles.sheetMusicError}>{error}</span>}
    </span>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePlaytimeSession } from "@/app/actions";
import styles from "./Playtime.module.css";

export function DeletePlaytimeButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      className={styles.deleteButton}
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await deletePlaytimeSession(id);
          router.refresh();
        });
      }}
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}

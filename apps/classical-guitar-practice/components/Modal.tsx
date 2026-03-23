"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./Modal.module.css";

export function Modal({
  children,
  closePath,
}: {
  children: React.ReactNode;
  closePath: string;
}) {
  const router = useRouter();

  function close() {
    router.push(closePath);
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.push(closePath);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router, closePath]);

  return (
    <div className={styles.modalBackdrop} onClick={close}>
      <div
        className={styles.modalDialog}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === "Escape") close(); }}
      >
        <button
          type="button"
          className={styles.modalClose}
          onClick={close}
          aria-label="Close"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

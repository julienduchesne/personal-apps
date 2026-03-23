"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import styles from "./Auth.module.css";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const wrong = searchParams.get("wrong") === "1";
  const [password, setPassword] = useState("");
  const [error, setError] = useState(wrong ? "Wrong password." : "");

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      const trimmed = password.trim();
      if (!trimmed) {
        setError("Enter a password.");
        return;
      }
      const url = new URL(next, window.location.origin);
      url.searchParams.set("password", trimmed);
      router.push(url.pathname + url.search);
    },
    [password, next, router]
  );

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>🎼</div>
        <h1 className={styles.heading}>Guitar Practice</h1>
        <form onSubmit={onSubmit}>
          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submitButton}>
            Continue
          </button>
        </form>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.page}>
          <div className={styles.card}>Loading…</div>
        </main>
      }
    >
      <AuthForm />
    </Suspense>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      document.cookie = `site_password=${encodeURIComponent(trimmed)}; path=/; samesite=lax`;
      router.push(next);
    },
    [password, next, router]
  );

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-lime-50/30">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="text-5xl mb-3">🍽️</div>
        <h1 className="text-2xl font-bold text-stone-800 mb-6">Meal Planner</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="rounded-xl"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full rounded-xl bg-orange-600 hover:bg-orange-700">
            Continue
          </Button>
        </form>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-lime-50/30">
          <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm text-center">
            Loading...
          </div>
        </main>
      }
    >
      <AuthForm />
    </Suspense>
  );
}

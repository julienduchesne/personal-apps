"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteRecipe } from "@/app/actions/recipes";

export function DeleteRecipeButton({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const password = searchParams.get("password");
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    await deleteRecipe(id);
    const url = password ? `/recipes?password=${encodeURIComponent(password)}` : "/recipes";
    router.push(url);
  }

  if (confirming) {
    return (
      <div className="flex gap-1">
        <Button variant="destructive" className="rounded-xl" onClick={handleDelete}>
          Confirm
        </Button>
        <Button variant="outline" className="rounded-xl" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      className="rounded-xl text-destructive hover:text-destructive/80 hover:bg-destructive/10"
      onClick={() => setConfirming(true)}
    >
      Delete
    </Button>
  );
}

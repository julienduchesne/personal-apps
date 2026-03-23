"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Recipe, Suggestion } from "@/lib/types";
import { logMeal, logAdHocMeal, deleteMealLog } from "@/app/actions/meals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagBadge } from "./TagBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  date: string;
  dateLabel: string;
  suggestions: Suggestion[];
  allRecipes: Recipe[];
  currentMeal?: { recipeId: string | null; freeText: string | null; recipeName?: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuggestionPicker({
  date,
  dateLabel,
  suggestions,
  allRecipes,
  currentMeal,
  open,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  function handlePickRecipe(recipeId: string) {
    startTransition(async () => {
      await logMeal(date, recipeId, null);
      onOpenChange(false);
      router.refresh();
    });
  }

  function handleLogAdHoc() {
    if (!search.trim()) return;
    startTransition(async () => {
      await logAdHocMeal(date, search.trim());
      setSearch("");
      onOpenChange(false);
      router.refresh();
    });
  }

  function handleClear() {
    startTransition(async () => {
      await deleteMealLog(date);
      onOpenChange(false);
      router.refresh();
    });
  }

  const filteredRecipes = search
    ? allRecipes.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-stone-800">{dateLabel}</DialogTitle>
        </DialogHeader>

        {currentMeal && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-3 mb-2 border border-emerald-200/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-700 uppercase tracking-wide font-medium">Currently logged</p>
                <p className="font-medium text-stone-800">
                  {currentMeal.recipeName ?? currentMeal.freeText ?? "Unknown"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={pending}
                className="text-red-400 hover:text-red-600"
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-orange-700">Suggestions</p>
            {suggestions.map((s) => (
              <button
                key={s.recipe.id}
                onClick={() => handlePickRecipe(s.recipe.id)}
                disabled={pending}
                className="w-full text-left bg-white border border-amber-200/60 hover:border-orange-400 hover:shadow-sm rounded-xl p-3 transition-all cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-stone-800 truncate">{s.recipe.name}</p>
                    <p className="text-xs text-teal-600 mt-0.5">
                      ⏱️ {s.recipe.prepTime}m
                    </p>
                  </div>
                  <span className="text-xs text-amber-500 font-medium shrink-0">
                    {Math.round(s.score)}pts
                  </span>
                </div>
                {s.recipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {s.recipe.tags.map((tag) => (
                      <TagBadge key={tag} tag={tag} />
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1.5">
                  {s.reasons.slice(0, 2).join(" · ")}
                </p>
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2 pt-2 border-t border-stone-200">
          <p className="text-sm font-medium text-teal-700">Search or type what you cooked</p>
          <div className="flex gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipes or type a meal..."
              className="rounded-xl"
              onKeyDown={(e) => {
                if (e.key === "Enter" && search.trim()) {
                  // If there's an exact match, pick that recipe; otherwise log ad-hoc
                  const exact = allRecipes.find(
                    (r) => r.name.toLowerCase() === search.trim().toLowerCase()
                  );
                  if (exact) {
                    handlePickRecipe(exact.id);
                  } else {
                    handleLogAdHoc();
                  }
                }
              }}
            />
            {search.trim() && filteredRecipes.length === 0 && (
              <Button
                onClick={handleLogAdHoc}
                disabled={pending}
                className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white shrink-0"
              >
                Log
              </Button>
            )}
          </div>
          {filteredRecipes.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {filteredRecipes.slice(0, 10).map((r) => (
                <button
                  key={r.id}
                  onClick={() => handlePickRecipe(r.id)}
                  disabled={pending}
                  className="w-full text-left text-sm py-1.5 px-2 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {r.name}
                  <span className="text-xs text-teal-500 ml-2">⏱️ {r.prepTime}m</span>
                </button>
              ))}
            </div>
          )}
          {search.trim() && filteredRecipes.length > 0 && !filteredRecipes.some(
            (r) => r.name.toLowerCase() === search.trim().toLowerCase()
          ) && (
            <button
              onClick={handleLogAdHoc}
              disabled={pending}
              className="w-full text-left text-sm py-1.5 px-2 rounded-lg hover:bg-orange-50 text-orange-700 transition-colors cursor-pointer disabled:opacity-50 border border-orange-200 border-dashed"
            >
              Log &ldquo;{search.trim()}&rdquo; as a new recipe
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

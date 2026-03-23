"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Recipe, Suggestion, getEffectivePrepTime } from "@/lib/types";
import { logMeal, logAdHocMeal, deleteMealLog } from "@/app/actions/meals";
import { logCookTime } from "@/app/actions/recipes";
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
  currentMeal?: { recipeId: string | null; freeText: string | null; recipeName?: string; recipe?: Recipe };
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
  const [cookTimeInput, setCookTimeInput] = useState("");
  const [cookTimeLogged, setCookTimeLogged] = useState(false);

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
      setCookTimeLogged(false);
      setCookTimeInput("");
      onOpenChange(false);
      router.refresh();
    });
  }

  function handleLogCookTime() {
    const minutes = Number(cookTimeInput);
    if (!minutes || minutes <= 0 || !currentMeal?.recipeId) return;
    startTransition(async () => {
      await logCookTime(currentMeal.recipeId!, minutes);
      setCookTimeLogged(true);
      router.refresh();
    });
  }

  const filteredRecipes = search
    ? allRecipes.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <Dialog open={open} onOpenChange={(v) => {
        if (!v) { setCookTimeLogged(false); setCookTimeInput(""); }
        onOpenChange(v);
      }}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">{dateLabel}</DialogTitle>
        </DialogHeader>

        {currentMeal && (
          <div className="bg-secondary rounded-xl p-3 mb-2 border border-secondary-foreground/20 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-secondary-foreground uppercase tracking-wide font-medium">Currently logged</p>
                <p className="font-medium text-foreground">
                  {currentMeal.recipeName ?? currentMeal.freeText ?? "Unknown"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={pending}
                className="text-destructive/70 hover:text-destructive"
              >
                Clear
              </Button>
            </div>
            {currentMeal.recipe && (
              <div className="pt-1 border-t border-secondary-foreground/10">
                <p className="text-xs text-secondary-foreground mb-1">
                  Expected: {getEffectivePrepTime(currentMeal.recipe)}m
                  {currentMeal.recipe.cookTimeLogs && currentMeal.recipe.cookTimeLogs.length > 0
                    ? ` (avg of ${currentMeal.recipe.cookTimeLogs.length} log${currentMeal.recipe.cookTimeLogs.length > 1 ? "s" : ""})`
                    : " (seed time)"}
                </p>
                {cookTimeLogged ? (
                  <p className="text-xs text-primary font-medium">Cook time logged!</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={cookTimeInput}
                      onChange={(e) => setCookTimeInput(e.target.value)}
                      placeholder="Actual minutes"
                      className="rounded-xl w-32 h-8 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleLogCookTime();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleLogCookTime}
                      disabled={pending || !cookTimeInput}
                      className="rounded-xl h-8 text-xs"
                    >
                      Log time
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">Suggestions</p>
            {suggestions.map((s) => (
              <button
                key={s.recipe.id}
                onClick={() => handlePickRecipe(s.recipe.id)}
                disabled={pending}
                className="w-full text-left bg-card border border-border hover:border-primary/40 hover:shadow-sm rounded-xl p-3 transition-all cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{s.recipe.name}</p>
                    <p className="text-xs text-secondary-foreground mt-0.5">
                      ⏱️ {getEffectivePrepTime(s.recipe)}m
                    </p>
                  </div>
                  <span className="text-xs text-primary/70 font-medium shrink-0">
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

        <div className="space-y-2 pt-2 border-t border-border">
          <p className="text-sm font-medium text-secondary-foreground">Search or type what you cooked</p>
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
                className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
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
                  className="w-full text-left text-sm py-1.5 px-2 rounded-lg hover:bg-accent transition-colors cursor-pointer disabled:opacity-50"
                >
                  {r.name}
                  <span className="text-xs text-secondary-foreground ml-2">⏱️ {getEffectivePrepTime(r)}m</span>
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
              className="w-full text-left text-sm py-1.5 px-2 rounded-lg hover:bg-accent text-primary transition-colors cursor-pointer disabled:opacity-50 border border-primary/30 border-dashed"
            >
              Log &ldquo;{search.trim()}&rdquo; as a new recipe
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

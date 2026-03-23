"use client";

import { useState } from "react";
import { Recipe, MealLog, Suggestion, DaySchedule } from "@/lib/types";
import { getDayNameShort, formatDateShort, today } from "@/lib/date-utils";
import { TagBadge } from "./TagBadge";
import { SuggestionPicker } from "./SuggestionPicker";

interface Props {
  date: string;
  dayOfWeek: number;
  schedule: DaySchedule | undefined;
  meal: MealLog | undefined;
  mealRecipe: Recipe | undefined;
  suggestions: Suggestion[];
  allRecipes: Recipe[];
}

export function DayCard({
  date,
  dayOfWeek,
  schedule,
  meal,
  mealRecipe,
  suggestions,
  allRecipes,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const todayStr = today();
  const isToday = date === todayStr;
  const isPast = date < todayStr;
  const cookingTime = schedule?.cookingTime ?? 30;

  const dateLabel = `${getDayNameShort(dayOfWeek)}, ${formatDateShort(date)}`;

  return (
    <>
      <button
        onClick={() => setPickerOpen(true)}
        className={`text-left w-full rounded-2xl border p-3 transition-all cursor-pointer hover:shadow-lg ${
          isToday
            ? "border-orange-400 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-md ring-2 ring-orange-300"
            : isPast
            ? "border-stone-200 bg-stone-50/60"
            : "border-amber-200/60 bg-white hover:border-orange-300 hover:bg-amber-50/30"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className={`text-xs font-semibold uppercase tracking-wide ${
              isToday ? "text-orange-600" : isPast ? "text-stone-400" : "text-teal-700"
            }`}>
              {getDayNameShort(dayOfWeek)}
            </span>
            <span className={`text-xs ml-1 ${isToday ? "text-orange-400" : "text-muted-foreground"}`}>
              {formatDateShort(date)}
            </span>
          </div>
          {cookingTime > 0 && (
            <span className="text-xs text-amber-500">⏱️ {cookingTime}m</span>
          )}
        </div>

        {/* Content */}
        {meal ? (
          // Logged meal
          <div className="space-y-1">
            <p className={`text-sm font-medium truncate ${isPast ? "text-stone-600" : "text-stone-800"}`}>
              {mealRecipe ? (
                <>
                  {mealRecipe.name}
                </>
              ) : (
                meal.freeText ?? "Unknown"
              )}
            </p>
            {mealRecipe && mealRecipe.tags.length > 0 && (
              <div className="flex flex-wrap gap-0.5">
                {mealRecipe.tags.slice(0, 3).map((tag) => (
                  <TagBadge key={tag} tag={tag} />
                ))}
              </div>
            )}
            <p className="text-xs text-emerald-600 font-semibold">✓ Logged</p>
          </div>
        ) : cookingTime === 0 ? (
          <p className="text-xs text-muted-foreground italic">No cooking</p>
        ) : isPast ? (
          <p className="text-xs text-muted-foreground italic">Nothing logged</p>
        ) : suggestions.length > 0 ? (
          // Future day with suggestions
          <div className="space-y-1">
            {suggestions.slice(0, 3).map((s, i) => (
              <div key={s.recipe.id} className="flex items-center gap-1.5">
                <span className="text-xs text-orange-400 font-bold">{i + 1}.</span>
                <span className="text-xs text-stone-700 truncate">{s.recipe.name}</span>
              </div>
            ))}
            {suggestions.length > 3 && (
              <p className="text-xs text-teal-600">+{suggestions.length - 3} more</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No suggestions available</p>
        )}
      </button>

      <SuggestionPicker
        date={date}
        dateLabel={dateLabel}
        suggestions={suggestions}
        allRecipes={allRecipes}
        currentMeal={
          meal
            ? {
                recipeId: meal.recipeId,
                freeText: meal.freeText,
                recipeName: mealRecipe?.name,
              }
            : undefined
        }
        open={pickerOpen}
        onOpenChange={setPickerOpen}
      />
    </>
  );
}

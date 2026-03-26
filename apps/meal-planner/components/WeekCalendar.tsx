"use client";

import { Recipe, MealLog, Suggestion, Snooze, DaySchedule } from "@/lib/types";
import { getDayOfWeek } from "@/lib/date-utils";
import { DayCard } from "./DayCard";

interface Props {
  dates: string[];
  schedule: DaySchedule[];
  meals: MealLog[];
  suggestions: Record<string, Suggestion[]>;
  allRecipes: Recipe[];
  snoozes: Snooze[];
}

export function WeekCalendar({ dates, schedule, meals, suggestions, allRecipes, snoozes }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {dates.map((date) => {
        const dayOfWeek = getDayOfWeek(date);
        const meal = meals.find((m) => m.date === date);
        const mealRecipe = meal?.recipeId
          ? allRecipes.find((r) => r.id === meal.recipeId)
          : undefined;

        return (
          <DayCard
            key={date}
            date={date}
            dayOfWeek={dayOfWeek}
            schedule={schedule.find((s) => s.dayOfWeek === dayOfWeek)}
            meal={meal}
            mealRecipe={mealRecipe}
            suggestions={suggestions[date] ?? []}
            allRecipes={allRecipes}
            snoozes={snoozes}
          />
        );
      })}
    </div>
  );
}

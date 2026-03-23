"use client";

import { Recipe } from "@/lib/types";
import { PickRateInfo } from "@/app/actions/meals";
import { TagBadge } from "./TagBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "./Link";

export function RecipeCard({ recipe, pickRate }: { recipe: Recipe; pickRate?: PickRateInfo }) {
  return (
    <Link href={`/recipes/${recipe.id}/edit`} className="block">
      <Card className="hover:shadow-lg transition-all rounded-2xl border-border hover:border-primary/40 hover:bg-accent/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground leading-tight">{recipe.name}</h3>
            <div className="flex items-center gap-2 shrink-0">
              {pickRate && pickRate.timesChosen > 0 && (
                <span className="text-xs text-primary/80 font-medium whitespace-nowrap">
                  {pickRate.timesChosen}× / {pickRate.daysInRotation}d
                </span>
              )}
              <span className="text-xs text-secondary-foreground whitespace-nowrap flex items-center gap-1">
                ⏱️ {recipe.prepTime}m
              </span>
            </div>
          </div>
          {recipe.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{recipe.description}</p>
          )}
          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {recipe.tags.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

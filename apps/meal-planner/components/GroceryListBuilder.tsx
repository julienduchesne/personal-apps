"use client";

import { useState, useMemo } from "react";
import { Recipe } from "@/lib/types";
import {
  buildGroceryList,
  formatAmounts,
  GroceryItem,
} from "@/lib/ingredients";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TagBadge } from "./TagBadge";

const MIN_MEALS = 5;
const MAX_MEALS = 7;

export function GroceryListBuilder({ recipes }: { recipes: Recipe[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [showList, setShowList] = useState(false);
  const [search, setSearch] = useState("");

  const atMax = selectedIds.size >= MAX_MEALS;

  const filteredRecipes = useMemo(() => {
    if (!search) return recipes;
    const q = search.toLowerCase();
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [recipes, search]);

  const groceryList: GroceryItem[] = useMemo(() => {
    if (!showList) return [];
    const selected = recipes.filter((r) => selectedIds.has(r.id));
    return buildGroceryList(
      selected.map((r) => ({ name: r.name, ingredients: r.ingredients }))
    );
  }, [showList, selectedIds, recipes]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_MEALS) {
        next.add(id);
      }
      return next;
    });
    // reset generated list when selection changes
    setShowList(false);
    setCheckedItems(new Set());
  }

  function toggleChecked(name: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  function handleGenerate() {
    setShowList(true);
    setCheckedItems(new Set());
  }

  function handleBack() {
    setShowList(false);
  }

  // ── Grocery list view ──────────────────────────────────────────────
  if (showList) {
    const unchecked = groceryList.filter(
      (item) => !checkedItems.has(item.displayName)
    );
    const checked = groceryList.filter((item) =>
      checkedItems.has(item.displayName)
    );
    const selectedRecipes = recipes.filter((r) => selectedIds.has(r.id));

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={handleBack}
          >
            ← Back
          </Button>
          <p className="text-sm text-muted-foreground">
            {checkedItems.size} / {groceryList.length} items checked
          </p>
        </div>

        {/* Selected meals summary */}
        <div className="flex flex-wrap gap-2">
          {selectedRecipes.map((r) => (
            <span
              key={r.id}
              className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-lg"
            >
              {r.name}
            </span>
          ))}
        </div>

        {/* Unchecked items */}
        {unchecked.length > 0 && (
          <Card className="rounded-2xl">
            <CardContent className="p-4 space-y-1">
              {unchecked.map((item) => (
                <GroceryRow
                  key={item.displayName}
                  item={item}
                  checked={false}
                  onToggle={() => toggleChecked(item.displayName)}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Checked items */}
        {checked.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              In cart
            </p>
            <Card className="rounded-2xl opacity-60">
              <CardContent className="p-4 space-y-1">
                {checked.map((item) => (
                  <GroceryRow
                    key={item.displayName}
                    item={item}
                    checked={true}
                    onToggle={() => toggleChecked(item.displayName)}
                  />
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {groceryList.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            The selected recipes have no ingredients listed.
          </p>
        )}
      </div>
    );
  }

  // ── Recipe selection view ──────────────────────────────────────────
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select {MIN_MEALS}–{MAX_MEALS} meals to generate a grocery list.
      </p>

      <input
        type="text"
        placeholder="Search recipes…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      />

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {selectedIds.size} / {MAX_MEALS} selected
        </p>
        {selectedIds.size >= MIN_MEALS && (
          <Button
            className="rounded-xl bg-primary hover:bg-primary/90"
            onClick={handleGenerate}
          >
            Generate grocery list
          </Button>
        )}
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-3">🛒</div>
          <p>No recipes yet. Add some recipes first!</p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRecipes.map((recipe) => {
            const selected = selectedIds.has(recipe.id);
            const disabled = atMax && !selected;
            return (
              <Card
                key={recipe.id}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                onClick={() => !disabled && toggle(recipe.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (!disabled) toggle(recipe.id);
                  }
                }}
                className={`rounded-2xl cursor-pointer transition-all select-none ${
                  selected
                    ? "ring-2 ring-primary bg-primary/5 border-primary/40"
                    : disabled
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:shadow-md hover:border-primary/40 hover:bg-accent/50"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground leading-tight">
                      {recipe.name}
                    </h3>
                    {selected && (
                      <span className="text-primary text-sm font-bold shrink-0">
                        ✓
                      </span>
                    )}
                  </div>
                  {recipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {recipe.tags.map((tag) => (
                        <TagBadge key={tag} tag={tag} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GroceryRow({
  item,
  checked,
  onToggle,
}: {
  item: GroceryItem;
  checked: boolean;
  onToggle: () => void;
}) {
  const amounts = formatAmounts(item.amounts);
  return (
    <label className="flex items-start gap-3 py-2 cursor-pointer group">
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm font-medium ${checked ? "line-through text-muted-foreground" : "text-foreground"}`}
        >
          {amounts && (
            <span className="text-primary font-semibold">{amounts} </span>
          )}
          {item.displayName}
        </span>
        {item.recipeNames.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {item.recipeNames.join(", ")}
          </p>
        )}
      </div>
    </label>
  );
}

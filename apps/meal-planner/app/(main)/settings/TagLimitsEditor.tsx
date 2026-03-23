"use client";

import { useState, useTransition } from "react";
import { TagLimit } from "@/lib/types";
import { upsertTagLimit, deleteTagLimit } from "@/app/actions/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagBadge } from "@/components/TagBadge";

export function TagLimitsEditor({
  tagLimits,
  allTags,
}: {
  tagLimits: TagLimit[];
  allTags: string[];
}) {
  const [limits, setLimits] = useState(tagLimits);
  const [newTag, setNewTag] = useState("");
  const [newMax, setNewMax] = useState(2);
  const [pending, startTransition] = useTransition();

  const unusedTags = allTags.filter((t) => !limits.some((l) => l.tag === t));

  function handleAdd() {
    const tag = newTag.trim().toLowerCase();
    if (!tag) return;
    const updated = [...limits.filter((l) => l.tag !== tag), { tag, maxPerWeek: newMax }];
    setLimits(updated);
    setNewTag("");
    startTransition(() => {
      upsertTagLimit(tag, newMax);
    });
  }

  function handleRemove(tag: string) {
    setLimits(limits.filter((l) => l.tag !== tag));
    startTransition(() => {
      deleteTagLimit(tag);
    });
  }

  function handleChangeMax(tag: string, max: number) {
    setLimits(limits.map((l) => (l.tag === tag ? { ...l, maxPerWeek: max } : l)));
    startTransition(() => {
      upsertTagLimit(tag, max);
    });
  }

  return (
    <div className="space-y-3">
      {limits.map((limit) => (
        <div
          key={limit.tag}
          className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border"
        >
          <TagBadge tag={limit.tag} />
          <span className="text-sm text-muted-foreground">max</span>
          <Input
            type="number"
            min={1}
            max={7}
            value={limit.maxPerWeek}
            onChange={(e) => handleChangeMax(limit.tag, Number(e.target.value))}
            className="w-16 rounded-lg text-center"
          />
          <span className="text-sm text-muted-foreground">per week</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRemove(limit.tag)}
            className="ml-auto text-destructive/70 hover:text-destructive"
          >
            Remove
          </Button>
        </div>
      ))}

      <div className="flex items-end gap-2 pt-2">
        <div className="flex-1">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Tag name..."
            className="rounded-xl"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          {newTag && unusedTags.filter((t) => t.includes(newTag.toLowerCase())).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {unusedTags
                .filter((t) => t.includes(newTag.toLowerCase()))
                .slice(0, 5)
                .map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewTag(t)}
                    className="cursor-pointer opacity-60 hover:opacity-100"
                  >
                    <TagBadge tag={t} />
                  </button>
                ))}
            </div>
          )}
        </div>
        <Input
          type="number"
          min={1}
          max={7}
          value={newMax}
          onChange={(e) => setNewMax(Number(e.target.value))}
          className="w-16 rounded-xl text-center"
        />
        <Button onClick={handleAdd} className="rounded-xl bg-primary hover:bg-primary/90">
          Add Limit
        </Button>
      </div>
      {pending && <p className="text-xs text-muted-foreground">Saving...</p>}
    </div>
  );
}

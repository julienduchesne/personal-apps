"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TagBadge } from "./TagBadge";
import { Recipe } from "@/lib/types";
import { createRecipe, updateRecipe, uploadRecipePdf, deleteRecipePdf } from "@/app/actions/recipes";

interface Props {
  recipe?: Recipe;
  allTags?: string[];
}

export function RecipeForm({ recipe, allTags = [] }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const password = searchParams.get("password");

  const [name, setName] = useState(recipe?.name ?? "");
  const [description, setDescription] = useState(recipe?.description ?? "");
  const [prepTime, setPrepTime] = useState(recipe?.prepTime ?? 30);
  const [ingredients, setIngredients] = useState(recipe?.ingredients ?? "");
  const [tags, setTags] = useState<string[]>(recipe?.tags ?? []);
  const [sourceUrl, setSourceUrl] = useState(recipe?.sourceUrl ?? "");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [hasPdf, setHasPdf] = useState(!!recipe?.sourcePdfKey);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  function addTag(tag: string) {
    const t = tag.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function buildUrl(path: string) {
    if (password) return `${path}?password=${encodeURIComponent(password)}`;
    return path;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { name, description, prepTime, ingredients, tags, sourceUrl: sourceUrl || undefined };
      if (recipe) {
        await updateRecipe(recipe.id, data);
        if (pdfFile) {
          const formData = new FormData();
          formData.append("pdf", pdfFile);
          await uploadRecipePdf(recipe.id, formData);
        } else if (!hasPdf && recipe.sourcePdfKey) {
          await deleteRecipePdf(recipe.id);
        }
        router.push(buildUrl(`/recipes`));
      } else {
        const created = await createRecipe(data);
        if (pdfFile) {
          const formData = new FormData();
          formData.append("pdf", pdfFile);
          await uploadRecipePdf(created.id, formData);
        }
        router.push(buildUrl(`/recipes`));
      }
    } finally {
      setSaving(false);
    }
  }

  const suggestedTags = allTags.filter(
    (t) => !tags.includes(t) && t.includes(tagInput.toLowerCase())
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="name">Recipe Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Spaghetti Bolognese"
          required
          className="rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A brief description..."
          className="rounded-xl"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="prepTime">Preparation Time (minutes)</Label>
        <Input
          id="prepTime"
          type="number"
          min={1}
          value={prepTime}
          onChange={(e) => setPrepTime(Number(e.target.value))}
          className="rounded-xl w-32"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ingredients">Ingredients (one per line)</Label>
        <Textarea
          id="ingredients"
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          placeholder={"200g spaghetti\n400g ground beef\n1 can tomatoes"}
          className="rounded-xl"
          rows={5}
        />
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag) => (
            <button key={tag} type="button" onClick={() => removeTag(tag)} className="cursor-pointer">
              <TagBadge tag={tag} />
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(tagInput);
              }
            }}
            placeholder="Add tag..."
            className="rounded-xl"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addTag(tagInput)}
            className="rounded-xl"
          >
            Add
          </Button>
        </div>
        {tagInput && suggestedTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {suggestedTags.slice(0, 8).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => addTag(t)}
                className="cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
              >
                <TagBadge tag={t} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="sourceUrl">Recipe Link (URL)</Label>
        <Input
          id="sourceUrl"
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://example.com/recipe"
          className="rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pdfUpload">Recipe PDF</Label>
        {hasPdf && !pdfFile && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>PDF attached</span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setHasPdf(false)}
              className="rounded-xl text-destructive hover:text-destructive/80"
            >
              Remove
            </Button>
          </div>
        )}
        <Input
          id="pdfUpload"
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            setPdfFile(file);
            if (file) setHasPdf(true);
          }}
          className="rounded-xl"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving} className="rounded-xl bg-primary hover:bg-primary/90">
          {saving ? "Saving..." : recipe ? "Update Recipe" : "Create Recipe"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="rounded-xl"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

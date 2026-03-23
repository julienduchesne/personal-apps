"use server";

import { readJson, writeJson, uploadFile, deleteBlob } from "@repo/storage";
import { Recipe } from "@/lib/types";
import { revalidatePath } from "next/cache";

const FILE = "recipes.json";

export async function getRecipes(): Promise<Recipe[]> {
  return (await readJson<Recipe[]>(FILE)) ?? [];
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const recipes = await getRecipes();
  return recipes.find((r) => r.id === id) ?? null;
}

export async function uploadRecipePdf(
  recipeId: string,
  formData: FormData
): Promise<string> {
  const file = formData.get("pdf") as File;
  if (!file || file.type !== "application/pdf") {
    throw new Error("Invalid PDF file");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `pdfs/${recipeId}.pdf`;
  await uploadFile(key, buffer, "application/pdf");

  const recipes = await getRecipes();
  const idx = recipes.findIndex((r) => r.id === recipeId);
  if (idx !== -1) {
    recipes[idx].sourcePdfKey = key;
    await writeJson(FILE, recipes);
    revalidatePath("/recipes");
  }
  return key;
}

export async function deleteRecipePdf(recipeId: string): Promise<void> {
  const recipes = await getRecipes();
  const idx = recipes.findIndex((r) => r.id === recipeId);
  if (idx === -1) return;
  const key = recipes[idx].sourcePdfKey;
  if (key) {
    await deleteBlob(key);
    recipes[idx].sourcePdfKey = undefined;
    await writeJson(FILE, recipes);
    revalidatePath("/recipes");
  }
}

export async function createRecipe(data: {
  name: string;
  description: string;
  prepTime: number;
  ingredients: string;
  tags: string[];
  sourceUrl?: string;
}): Promise<Recipe> {
  const recipes = await getRecipes();
  const recipe: Recipe = {
    id: crypto.randomUUID(),
    ...data,
    createdAt: new Date().toISOString(),
  };
  recipes.push(recipe);
  await writeJson(FILE, recipes);
  revalidatePath("/recipes");
  revalidatePath("/week");
  return recipe;
}

export async function updateRecipe(
  id: string,
  data: {
    name: string;
    description: string;
    prepTime: number;
    ingredients: string;
    tags: string[];
    sourceUrl?: string;
  }
): Promise<Recipe | null> {
  const recipes = await getRecipes();
  const idx = recipes.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  recipes[idx] = { ...recipes[idx], ...data };
  await writeJson(FILE, recipes);
  revalidatePath("/recipes");
  revalidatePath("/week");
  return recipes[idx];
}

export async function deleteRecipe(id: string): Promise<void> {
  const recipes = await getRecipes();
  const recipe = recipes.find((r) => r.id === id);
  if (recipe?.sourcePdfKey) {
    await deleteBlob(recipe.sourcePdfKey);
  }
  const filtered = recipes.filter((r) => r.id !== id);
  await writeJson(FILE, filtered);
  revalidatePath("/recipes");
  revalidatePath("/week");
}

export async function logCookTime(
  recipeId: string,
  minutes: number
): Promise<void> {
  const recipes = await getRecipes();
  const idx = recipes.findIndex((r) => r.id === recipeId);
  if (idx === -1) return;
  if (!recipes[idx].cookTimeLogs) {
    recipes[idx].cookTimeLogs = [];
  }
  recipes[idx].cookTimeLogs!.push(minutes);
  await writeJson(FILE, recipes);
  revalidatePath("/recipes");
  revalidatePath("/week");
}

export async function getAllTags(): Promise<string[]> {
  const recipes = await getRecipes();
  const tagSet = new Set<string>();
  for (const r of recipes) {
    for (const t of r.tags) {
      tagSet.add(t);
    }
  }
  return Array.from(tagSet).sort();
}

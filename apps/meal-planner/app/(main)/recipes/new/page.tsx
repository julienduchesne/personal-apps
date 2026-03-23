import { unstable_noStore as noStore } from "next/cache";
import { getAllTags } from "@/app/actions/recipes";
import { RecipeForm } from "@/components/RecipeForm";

export default async function NewRecipePage() {
  noStore();
  const allTags = await getAllTags();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">New Recipe</h1>
      <RecipeForm allTags={allTags} />
    </div>
  );
}

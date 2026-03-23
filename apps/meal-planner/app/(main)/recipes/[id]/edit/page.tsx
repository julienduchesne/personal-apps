import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { getRecipe, getAllTags } from "@/app/actions/recipes";
import { RecipeForm } from "@/components/RecipeForm";
import { DeleteRecipeButton } from "../DeleteRecipeButton";

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  noStore();
  const { id } = await params;
  const [recipe, allTags] = await Promise.all([getRecipe(id), getAllTags()]);
  if (!recipe) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground font-heading">Edit Recipe</h1>
        <DeleteRecipeButton id={recipe.id} />
      </div>
      <RecipeForm recipe={recipe} allTags={allTags} />
    </div>
  );
}

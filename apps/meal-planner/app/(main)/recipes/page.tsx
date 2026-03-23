import { unstable_noStore as noStore } from "next/cache";
import { getRecipes } from "@/app/actions/recipes";
import { getPickRates } from "@/app/actions/meals";
import { RecipeCard } from "@/components/RecipeCard";
import { Link } from "@/components/Link";
import { Button } from "@/components/ui/button";

export default async function RecipesPage() {
  noStore();
  const recipes = await getRecipes();
  const pickRates = await getPickRates(recipes);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Recipes</h1>
        <Link href="/recipes/new">
          <Button className="rounded-xl bg-orange-600 hover:bg-orange-700">+ Add Recipe</Button>
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-3">📖</div>
          <p>No recipes yet. Add your first recipe to get started!</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recipes
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} pickRate={pickRates[recipe.id]} />
            ))}
        </div>
      )}
    </div>
  );
}

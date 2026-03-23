import { unstable_noStore as noStore } from "next/cache";
import { getRecipes } from "@/app/actions/recipes";
import { GroceryListBuilder } from "@/components/GroceryListBuilder";

export default async function GroceriesPage() {
  noStore();
  const recipes = await getRecipes();
  const sorted = [...recipes].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground font-heading">
        Groceries
      </h1>
      <GroceryListBuilder recipes={sorted} />
    </div>
  );
}

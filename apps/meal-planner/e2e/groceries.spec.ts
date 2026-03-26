import { test, expect } from "@playwright/test";
import { clearData } from "./minio-global-setup";

function recipeFixture(name: string, ingredients: string) {
  return { name, ingredients };
}

const RECIPES = [
  recipeFixture("Spaghetti Bolognese", "500g ground beef\n2 cans crushed tomatoes\n1 onion\n3 cloves garlic\n400g spaghetti\n2 tbsp olive oil"),
  recipeFixture("Chicken Stir Fry", "500g chicken breast\n2 cups broccoli\n1 red pepper\n3 cloves garlic\n2 tbsp soy sauce\n1 tbsp olive oil"),
  recipeFixture("Veggie Tacos", "1 can black beans\n2 tomatoes\n1 onion\n1 cup cheese\n8 taco shells\n1 avocado"),
  recipeFixture("Beef Stew", "600g stewing beef\n3 potatoes\n2 carrots\n1 onion\n2 cups beef broth\n1 tbsp olive oil"),
  recipeFixture("Pasta Primavera", "400g penne\n2 cups broccoli\n1 red pepper\n1 cup cherry tomatoes\n2 tbsp olive oil\n100g parmesan"),
];

test.describe("Grocery list", () => {
  test.beforeEach(async ({ page }) => {
    await clearData();
    // Create test recipes
    for (const recipe of RECIPES) {
      await page.goto("/recipes/new");
      await page.getByLabel("Recipe Name").fill(recipe.name);
      await page.getByLabel("Preparation Time (minutes)").fill("30");
      await page.getByLabel("Ingredients").fill(recipe.ingredients);
      await page.getByRole("button", { name: "Create Recipe" }).click();
      await page.waitForURL("**/recipes");
    }
  });

  test("can navigate to groceries page", async ({ page }) => {
    await page.goto("/groceries");
    await expect(page.getByRole("heading", { name: "Groceries" })).toBeVisible();
    await expect(page.getByText(/Select 5–7 meals/)).toBeVisible();
  });

  test("can select recipes and generate grocery list", async ({ page }) => {
    await page.goto("/groceries");

    // Select 5 recipes
    for (const recipe of RECIPES) {
      await page.getByRole("button", { name: recipe.name }).click();
    }

    // Should show 5 / 7 selected
    await expect(page.getByText("5 / 7 selected")).toBeVisible();

    // Generate button should be visible
    const generateBtn = page.getByRole("button", { name: "Generate grocery list" });
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();

    // Should show the grocery list
    await expect(page.getByRole("button", { name: "← Back" })).toBeVisible();

    // Olive oil appears in 4 recipes — should be combined
    await expect(page.getByText("olive oil")).toBeVisible();

    // Onion appears in 3 recipes — should be combined
    await expect(page.getByText("onion")).toBeVisible();

    // Can check items off
    const firstCheckbox = page.locator('[role="checkbox"]').first();
    await firstCheckbox.click();
    await expect(page.getByText("In cart")).toBeVisible();
  });

  test("cannot select more than 7 recipes", async ({ page }) => {
    // First create 3 more recipes to have 8 total
    for (let i = 0; i < 3; i++) {
      await page.goto("/recipes/new");
      await page.getByLabel("Recipe Name").fill(`Extra Recipe ${i + 1}`);
      await page.getByLabel("Preparation Time (minutes)").fill("20");
      await page.getByLabel("Ingredients").fill("1 cup flour\n2 eggs");
      await page.getByRole("button", { name: "Create Recipe" }).click();
      await page.waitForURL("**/recipes");
    }

    await page.goto("/groceries");

    // Select 7 recipes
    for (const recipe of RECIPES) {
      await page.getByRole("button", { name: recipe.name }).click();
    }
    await page.getByRole("button", { name: "Extra Recipe 1" }).click();
    await page.getByRole("button", { name: "Extra Recipe 2" }).click();

    await expect(page.getByText("7 / 7 selected")).toBeVisible();

    // The 8th card should be visually disabled (opacity)
    const extraCard3 = page.getByRole("button", { name: "Extra Recipe 3" });
    await expect(extraCard3).toHaveCSS("opacity", "0.5");
  });

  test("search filters recipes", async ({ page }) => {
    await page.goto("/groceries");

    await page.getByPlaceholder("Search recipes").fill("Chicken");
    // Only Chicken Stir Fry should be visible
    await expect(page.getByRole("button", { name: "Chicken Stir Fry" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Spaghetti Bolognese" })).not.toBeVisible();
  });

  test("combines similar ingredients (plural normalization)", async ({ page }) => {
    // Create recipes with potato/potatoes to test normalization
    await page.goto("/recipes/new");
    await page.getByLabel("Recipe Name").fill("Mashed Potatoes");
    await page.getByLabel("Preparation Time (minutes)").fill("20");
    await page.getByLabel("Ingredients").fill("5 potatoes\n2 tbsp butter\n1 cup milk");
    await page.getByRole("button", { name: "Create Recipe" }).click();
    await page.waitForURL("**/recipes");

    await page.goto("/groceries");

    // Select the 5 original recipes plus "Mashed Potatoes"
    for (const recipe of RECIPES) {
      await page.getByRole("button", { name: recipe.name }).click();
    }
    await page.getByRole("button", { name: "Mashed Potatoes" }).click();

    await page.getByRole("button", { name: "Generate grocery list" }).click();

    // "potato" (from Beef Stew: 3 potatoes) and "potatoes" (from Mashed: 5 potatoes)
    // should be merged — both recipe names should appear as sources for potatoes
    await expect(page.getByText("Beef Stew, Mashed Potatoes")).toBeVisible();
  });

  test("back button returns to recipe selection", async ({ page }) => {
    await page.goto("/groceries");

    // Select 5 recipes
    for (const recipe of RECIPES) {
      await page.getByRole("button", { name: recipe.name }).click();
    }
    await page.getByRole("button", { name: "Generate grocery list" }).click();

    // Click back
    await page.getByRole("button", { name: "← Back" }).click();

    // Should be back on selection view
    await expect(page.getByText(/Select 5–7 meals/)).toBeVisible();
  });
});

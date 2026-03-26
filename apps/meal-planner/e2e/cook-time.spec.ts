import { test, expect } from "@playwright/test";
import { clearData } from "./minio-global-setup";

test.describe("Cook time logging", () => {
  test.beforeEach(async ({ page }) => {
    await clearData();
    // Create a test recipe
    await page.goto("/recipes/new");
    await page.getByLabel("Recipe Name").fill("Test Pasta");
    await page.getByLabel("Preparation Time (minutes)").fill("30");
    await page.getByLabel("Description").fill("Test recipe for cook time");
    await page.getByRole("button", { name: "Create Recipe" }).click();
    await page.waitForURL("**/recipes");
  });

  test("shows seed time when no cook times logged", async ({ page }) => {
    await page.goto("/week");
    await page.waitForURL("**/week/**");
    // The recipe card in suggestions should show 30m (seed time)
    // Find a day card and click it to open the picker
    const dayButton = page.locator("button.text-left").first();
    await dayButton.click();

    // Check that the suggestion shows the seed prep time
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("30m").first()).toBeVisible();
  });

  test("can log cook time for a recipe-based meal", async ({ page }) => {
    await page.goto("/week");
    await page.waitForURL("**/week/**");

    // Click a future day to open picker
    const dayButton = page.locator("button.text-left").first();
    await dayButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Search for our recipe and pick it
    await dialog.getByPlaceholder("Search recipes or type a meal...").fill("Test Pasta");
    await dialog.getByText("Test Pasta").first().click();

    // Re-open the picker to see the logged meal
    await dayButton.click();
    await expect(dialog).toBeVisible();

    // Should see "Currently logged" with the recipe
    await expect(dialog.getByText("Currently logged")).toBeVisible();
    await expect(dialog.getByText("Test Pasta").first()).toBeVisible();

    // Should see cook time input with "Expected: 30m (seed time)"
    await expect(dialog.getByText("Expected: 30m")).toBeVisible();
    await expect(dialog.getByText("(seed time)")).toBeVisible();

    // Log a cook time
    await dialog.getByPlaceholder("Actual minutes").fill("25");
    await dialog.getByRole("button", { name: "Log time" }).click();

    // Should see confirmation
    await expect(dialog.getByText("Cook time logged!")).toBeVisible();
  });

  test("shows average after multiple cook time logs", async ({ page }) => {
    await page.goto("/week");
    await page.waitForURL("**/week/**");

    // Pick the recipe for a day
    const dayButton = page.locator("button.text-left").first();
    await dayButton.click();
    const dialog = page.getByRole("dialog");
    await dialog.getByPlaceholder("Search recipes or type a meal...").fill("Test Pasta");
    await dialog.getByText("Test Pasta").first().click();

    // Log first cook time
    await expect(dialog).not.toBeVisible();
    await dayButton.click();
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder("Actual minutes").fill("20");
    await dialog.getByRole("button", { name: "Log time" }).click();
    await expect(dialog.getByText("Cook time logged!")).toBeVisible();

    // Close and re-open to see updated time
    await page.keyboard.press("Escape");

    // Open again — expected time should now be 20m (avg of 1 log)
    await dayButton.click();
    await expect(dialog.getByText("Expected: 20m")).toBeVisible();
    await expect(dialog.getByText("(avg of 1 log)")).toBeVisible();
  });
});

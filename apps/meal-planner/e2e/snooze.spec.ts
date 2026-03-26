import { test, expect } from "@playwright/test";
import { clearData } from "./minio-global-setup";

test.describe.serial("Snooze recipes", () => {
  test.beforeEach(async ({ page }) => {
    await clearData();
    // Create a test recipe
    await page.goto("/recipes/new");
    await page.getByLabel("Recipe Name").fill("Snooze Test Recipe");
    await page.getByLabel("Preparation Time (minutes)").fill("30");
    await page.getByLabel("Description").fill("Test recipe for snoozing");
    await page.getByRole("button", { name: "Create Recipe" }).click();
    await page.waitForURL("**/recipes");
  });

  test("can snooze a suggestion and it disappears", async ({ page }) => {
    await page.goto("/week");
    await page.waitForURL("**/week/**");

    const dayButton = page.locator("button.text-left").first();
    await dayButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Snooze Test Recipe").first()).toBeVisible();

    // Snooze the recipe
    await dialog.getByRole("button", { name: "💤" }).first().click();
    await expect(dialog.getByRole("textbox", { name: "Reason" })).toHaveValue("Missing ingredients");
    await dialog.getByRole("button", { name: "Snooze", exact: true }).click();

    // Close dialog, wait for it to disappear, then re-open
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await dayButton.click();
    await expect(dialog).toBeVisible();

    // Should appear in snoozed section
    await expect(dialog.getByText("Snoozed")).toBeVisible();
    await expect(dialog.getByText("Missing ingredients")).toBeVisible();
  });

  test("can unsnooze a recipe", async ({ page }) => {
    await page.goto("/week");
    await page.waitForURL("**/week/**");

    const dayButton = page.locator("button.text-left").first();
    await dayButton.click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "💤" }).first().click();
    await dialog.getByRole("button", { name: "Snooze", exact: true }).click();

    // Close and re-open
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await dayButton.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Snoozed")).toBeVisible();

    // Unsnooze
    await dialog.getByRole("button", { name: "Unsnooze" }).click();

    // Close and re-open to verify
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await dayButton.click();
    await expect(dialog).toBeVisible();

    // Recipe should be back in suggestions
    await expect(dialog.getByText("Snooze Test Recipe").first()).toBeVisible();
    await expect(dialog.getByText("Snoozed")).not.toBeVisible();
  });

  test("can snooze with a custom reason", async ({ page }) => {
    await page.goto("/week");
    await page.waitForURL("**/week/**");

    const dayButton = page.locator("button.text-left").first();
    await dayButton.click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "💤" }).first().click();

    // Change the reason
    const reasonInput = dialog.getByRole("textbox", { name: "Reason" });
    await reasonInput.clear();
    await reasonInput.fill("Too tired");
    await dialog.getByRole("button", { name: "Snooze", exact: true }).click();

    // Close and re-open
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await dayButton.click();
    await expect(dialog).toBeVisible();

    // Custom reason should appear in snoozed section
    await expect(dialog.getByText("Too tired")).toBeVisible();
  });
});

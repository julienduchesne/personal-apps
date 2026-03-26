import { test, expect } from "@playwright/test";
import { clearData } from "./minio-global-setup";

test.describe("Leftovers", () => {
  test.beforeEach(async () => {
    await clearData();
  });

  test("can log leftovers for a day", async ({ page }) => {
    await page.goto("/week");
    await page.waitForURL("**/week/**");

    // Click the first day card to open the picker
    const dayButton = page.locator("button.text-left").first();
    await dayButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Click the Leftovers button
    await dialog.getByRole("button", { name: "Leftovers" }).click();

    // Dialog should close and day card should show "Leftovers" as logged
    await expect(dialog).not.toBeVisible();
    await expect(dayButton.getByText("Leftovers")).toBeVisible();
    await expect(dayButton.getByText("Logged")).toBeVisible();
  });

  test("leftovers button is hidden when meal is already logged", async ({ page }) => {
    await page.goto("/week");
    await page.waitForURL("**/week/**");

    // Log leftovers first
    const dayButton = page.locator("button.text-left").first();
    await dayButton.click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Leftovers" }).click();
    await expect(dialog).not.toBeVisible();

    // Re-open picker — leftovers button should not be visible
    await dayButton.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Currently logged")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Leftovers" })).not.toBeVisible();
  });
});

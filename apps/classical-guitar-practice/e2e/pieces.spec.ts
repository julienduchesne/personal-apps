import { test, expect } from "@playwright/test";

test.describe("Pieces page", () => {
  test("shows heading and add button", async ({ page }) => {
    await page.goto("/pieces");
    await expect(page.getByRole("heading", { name: "Pieces", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "+" })).toBeVisible();
  });

  test("shows sort control with Name as default", async ({ page }) => {
    await page.goto("/pieces");
    const sortSelect = page.locator("#piece-sort");
    // Sort control only appears when there are pieces
    const hasPieces = await page.locator("main ul li").count() > 0;
    if (hasPieces) {
      await expect(sortSelect).toBeVisible();
      await expect(sortSelect).toHaveValue("name");
    }
  });

  test("sort control changes value when selected", async ({ page }) => {
    await page.goto("/pieces");
    const hasPieces = await page.locator("main ul li").count() > 0;
    if (!hasPieces) {
      test.skip();
      return;
    }
    const sortSelect = page.locator("#piece-sort");
    await sortSelect.selectOption("playCount");
    await expect(sortSelect).toHaveValue("playCount");

    await sortSelect.selectOption("level");
    await expect(sortSelect).toHaveValue("level");

    await sortSelect.selectOption("knowledge");
    await expect(sortSelect).toHaveValue("knowledge");

    await sortSelect.selectOption("lastPlayed");
    await expect(sortSelect).toHaveValue("lastPlayed");

    await sortSelect.selectOption("name");
    await expect(sortSelect).toHaveValue("name");
  });

  test("add button navigates to ?add=1", async ({ page }) => {
    await page.goto("/pieces");
    await page.getByRole("link", { name: "+" }).click();
    await expect(page).toHaveURL(/[?&]add=1/);
  });

  test("add modal opens and shows title field", async ({ page }) => {
    await page.goto("/pieces?add=1");
    await expect(page.getByRole("textbox", { name: "Title" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add piece" })).toBeVisible();
  });

  test("add modal closes via close button", async ({ page }) => {
    await page.goto("/pieces?add=1");
    await expect(page.getByRole("textbox", { name: "Title" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page).toHaveURL(/\/pieces([?](?!.*add=1).*)?$/);
    await expect(page.getByRole("textbox", { name: "Title" })).not.toBeVisible();
  });

  test("add modal closes via Escape key", async ({ page }) => {
    await page.goto("/pieces?add=1");
    await expect(page.getByRole("textbox", { name: "Title" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("textbox", { name: "Title" })).not.toBeVisible();
  });
});

import { test, expect } from "@playwright/test";

test.describe("Playtime page", () => {
  test("shows heading", async ({ page }) => {
    await page.goto("/playtime");
    await expect(page.getByRole("heading", { name: "Playtime" })).toBeVisible();
  });

  test("shows calendar with navigation buttons", async ({ page }) => {
    await page.goto("/playtime");
    await expect(page.getByRole("button", { name: "Previous month" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next month" })).toBeVisible();
  });

  test("calendar navigation changes the displayed month", async ({ page }) => {
    await page.goto("/playtime");
    const monthEl = page.locator("span").filter({ hasText: /^[A-Z][a-z]+ \d{4}$/ }).first();
    const initialMonth = await monthEl.textContent();
    await page.getByRole("button", { name: "Previous month" }).click();
    const newMonth = await monthEl.textContent();
    expect(newMonth).not.toBe(initialMonth);
  });

  test("calendar next month button works", async ({ page }) => {
    await page.goto("/playtime");
    const monthEl = page.locator("span").filter({ hasText: /^[A-Z][a-z]+ \d{4}$/ }).first();
    const initialMonth = await monthEl.textContent();
    await page.getByRole("button", { name: "Next month" }).click();
    const newMonth = await monthEl.textContent();
    expect(newMonth).not.toBe(initialMonth);
  });

  test("shows daily target input", async ({ page }) => {
    await page.goto("/playtime");
    await expect(page.getByLabel("Daily target")).toBeVisible();
  });

  test("daily target input accepts a numeric value", async ({ page }) => {
    await page.goto("/playtime");
    const targetInput = page.getByLabel("Daily target");
    await targetInput.fill("45");
    await targetInput.press("Enter");
    await expect(targetInput).toHaveValue("45");
  });

  test("shows empty state when no sessions", async ({ page }) => {
    await page.goto("/playtime");
    const hasEditLinks = await page.getByRole("link", { name: "Edit" }).count() > 0;
    if (!hasEditLinks) {
      await expect(page.getByText("No sessions yet")).toBeVisible();
    }
  });

  test("edit modal opens with start time, end time, and paused time fields", async ({ page }) => {
    await page.goto("/playtime");
    const hasEditLinks = await page.getByRole("link", { name: "Edit" }).count() > 0;
    if (!hasEditLinks) {
      test.skip();
      return;
    }
    const editLink = page.getByRole("link", { name: "Edit" }).first();
    await editLink.click();
    await expect(page.getByLabel("Start time")).toBeVisible();
    await expect(page.getByLabel("End time (leave blank if in progress)")).toBeVisible();
    await expect(page.getByLabel("Paused minutes")).toBeVisible();
    await expect(page.getByLabel("Paused seconds")).toBeVisible();
  });

  test("edit modal closes via close button", async ({ page }) => {
    await page.goto("/playtime");
    const hasEditLinks = await page.getByRole("link", { name: "Edit" }).count() > 0;
    if (!hasEditLinks) {
      test.skip();
      return;
    }
    const editLink = page.getByRole("link", { name: "Edit" }).first();
    await editLink.click();
    await expect(page.getByLabel("Start time")).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByLabel("Start time")).not.toBeVisible();
  });
});

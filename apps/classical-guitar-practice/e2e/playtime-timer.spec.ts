import { test, expect } from "@playwright/test";
import { clearSessions } from "./minio-global-setup";

/** Parse "M:SS" or "H:MM:SS" button label → total seconds */
function parseElapsed(text: string): number {
  const parts = text
    .replace("⏹", "")
    .trim()
    .split(":")
    .map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + parts[1];
}

test.beforeEach(async () => {
  await clearSessions();
});

test.describe("Session timer", () => {
  test("shows 0:00 immediately after starting (no 30-second jump)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "▶ Start Session" }).click();

    // Wait for the active-session UI (stop button appears)
    const stopBtn = page.getByRole("button", { name: /⏹/ });
    await expect(stopBtn).toBeVisible({ timeout: 10000 });

    // Elapsed should be very small – definitely not a 30-second jump
    const text = await stopBtn.textContent() ?? "";
    expect(parseElapsed(text)).toBeLessThan(5);
  });

  test("timer counts up while running", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "▶ Start Session" }).click();

    const stopBtn = page.getByRole("button", { name: /⏹/ });
    await expect(stopBtn).toBeVisible({ timeout: 10000 });

    // Wait for the timer to reach at least 2 seconds
    await expect(async () => {
      const text = await stopBtn.textContent() ?? "";
      expect(parseElapsed(text)).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 10000 });
  });

  test("pausing freezes the timer and resuming continues it without a jump", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "▶ Start Session" }).click();

    const stopBtn = page.getByRole("button", { name: /⏹/ });
    await expect(stopBtn).toBeVisible({ timeout: 10000 });

    // Wait until at least 2 seconds have elapsed
    await expect(async () => {
      const text = await stopBtn.textContent() ?? "";
      expect(parseElapsed(text)).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 10000 });

    // Pause
    await page.getByRole("button", { name: "⏸ Pause" }).click();
    const resumeBtn = page.getByRole("button", { name: "▶ Resume" });
    await expect(resumeBtn).toBeVisible({ timeout: 5000 });

    // Record the frozen elapsed value
    const frozenText = await stopBtn.textContent() ?? "";
    const frozenElapsed = parseElapsed(frozenText);
    expect(frozenElapsed).toBeGreaterThanOrEqual(2);

    // Wait 2 seconds – timer must stay frozen
    await page.waitForTimeout(2000);
    const stillFrozenText = await stopBtn.textContent() ?? "";
    expect(parseElapsed(stillFrozenText)).toBe(frozenElapsed);

    // Resume
    await resumeBtn.click();
    await expect(page.getByRole("button", { name: "⏸ Pause" })).toBeVisible({
      timeout: 5000,
    });

    // Elapsed right after resume should still be close to frozenElapsed (not -30 or +30)
    const resumedText = await stopBtn.textContent() ?? "";
    const resumedElapsed = parseElapsed(resumedText);
    expect(resumedElapsed).toBeGreaterThanOrEqual(frozenElapsed);
    expect(resumedElapsed).toBeLessThan(frozenElapsed + 5);

    // Timer should continue increasing
    await expect(async () => {
      const text = await stopBtn.textContent() ?? "";
      expect(parseElapsed(text)).toBeGreaterThan(frozenElapsed);
    }).toPass({ timeout: 10000 });
  });

  test("stopping a session returns to the start button", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "▶ Start Session" }).click();

    const stopBtn = page.getByRole("button", { name: /⏹/ });
    await expect(stopBtn).toBeVisible({ timeout: 10000 });

    await stopBtn.click();
    await expect(
      page.getByRole("button", { name: "▶ Start Session" })
    ).toBeVisible({ timeout: 10000 });
  });
});

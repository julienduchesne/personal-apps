import { expect, test } from "@playwright/test";

test("recognizes a photographed staff, saves corrections, and keeps it after reload", async ({ page }) => {
  await page.goto("/sightstring");
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 400;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "white";
    context.fillRect(0, 0, 900, 400);
    context.fillStyle = "black";
    for (let line = 0; line < 5; line++) context.fillRect(50, 120 + line * 20 - 1, 800, 2);
    for (const [x, y, up] of [[180, 200, true], [358, 150, true], [536, 130, false]] as const) {
      context.save();
      context.translate(x, y);
      context.rotate(-0.28);
      context.beginPath();
      context.ellipse(0, 0, 13.6, 9.4, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
      context.fillRect(x + (up ? 11 : -13), y + (up ? -62 : 0), 2.5, 62);
    }
    return canvas.toDataURL("image/png").split(",")[1];
  });

  await page.getByLabel("Upload score photos").setInputFiles({ name: "printed-exercise.png", mimeType: "image/png", buffer: Buffer.from(image, "base64") });
  await expect(page.getByRole("heading", { name: "Review scan" })).toBeVisible();
  await expect(page.getByText("3 notes", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit note 1 E4" }).click();
  await page.getByLabel("Accidental").selectOption("1");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("button", { name: "Edit note 1 E♯4" })).toBeVisible();
  await page.getByLabel("Score title").fill("Printed exercise");
  await page.getByRole("button", { name: "Save and practice" }).click();
  await expect(page.getByRole("heading", { name: "Printed exercise" })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Printed exercise", { exact: true })).toBeVisible();
});

test("turns the expected note green when microphone audio matches", async ({ page }) => {
  await page.addInitScript(() => {
    const media = navigator.mediaDevices;
    Object.defineProperty(media, "getUserMedia", {
      value: async () => {
        const context = new AudioContext();
        await context.resume();
        const destination = context.createMediaStreamDestination();
        const string = context.createOscillator();
        const amplitude = context.createGain();
        string.frequency.value = 82.4069;
        amplitude.gain.value = 0.12;
        string.connect(amplitude).connect(destination);
        string.start();
        return destination.stream;
      },
    });
  });
  await page.goto("/sightstring");
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await page.getByRole("button", { name: "Start listening" }).click();
  await expect(page.getByText("1 of 16 notes played")).toBeVisible();
  await expect(page.locator('[data-note="demo-0-0"]')).toHaveAttribute("data-status", "correct");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByText("Play at your own pace")).toBeVisible();
});

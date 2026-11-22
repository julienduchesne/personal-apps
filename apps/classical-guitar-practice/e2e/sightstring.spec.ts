import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

async function printedPage(page: Page, count = 3) {
  const image = await page.evaluate((noteCount) => {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 400;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "white";
    context.fillRect(0, 0, 900, 400);
    context.fillStyle = "black";
    for (let line = 0; line < 5; line++) context.fillRect(50, 120 + line * 20 - 1, 800, 2);
    const notes = [[180, 200, true], [358, 150, true], [536, 130, false]] as const;
    for (const [x, y, up] of notes.slice(0, noteCount)) {
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
  }, count);
  return { name: "printed-exercise.png", mimeType: "image/png", buffer: Buffer.from(image, "base64") };
}

test("keeps a ledger-line note and skips the fingering 3 beside it", async ({ page }) => {
  await page.goto("/sightstring");
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 540;
    canvas.height = 300;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#0f0f0f";
    for (let line = 0; line < 5; line++) context.fillRect(20, 65 + line * 20, 500, 2);

    const x = 290;
    const y = 165;
    context.fillRect(x - 19, y, 38, 2);
    for (let v = -12; v <= 12; v++) {
      for (let u = -16; u <= 16; u++) {
        if ((u / 13) ** 2 + ((v + u * 0.29) / 9) ** 2 <= 1) context.fillRect(x + u, y + v, 1, 1);
      }
    }
    context.fillRect(x + 10, y - 65, 3, 65);

    const digit = [".####.", "######", "....##", "...###", ".#####", "....##", "....##", "##..##", "#####.", ".###.."];
    digit.forEach((line, row) => {
      [...line].forEach((pixel, column) => {
        if (pixel !== "#") return;
        const top = Math.round(y + 18 + row * 1.8);
        const bottom = Math.round(y + 18 + (row + 1) * 1.8);
        context.fillRect(x - 6 + column * 2, top, 2, bottom - top);
      });
    });
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.getByLabel("Upload score photos").setInputFiles({
    name: "fingering.png", mimeType: "image/png", buffer: Buffer.from(image, "base64"),
  });
  await expect(page.getByRole("heading", { name: "Review scan" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Edit note/ })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Edit note 1 C4" })).toBeVisible();
});

test("saves a score and its photo across browsers and supports downloading and rescanning", async ({ page, browser, baseURL }) => {
  const title = `Printed exercise ${crypto.randomUUID()}`;
  await page.goto("/sightstring");
  await page.getByLabel("Upload score photos").setInputFiles(await printedPage(page));
  await expect(page.getByRole("heading", { name: "Review scan" })).toBeVisible();
  await expect(page.getByText("3 notes", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit note 1 E4" }).click();
  await page.getByLabel("Accidental").selectOption("1");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("button", { name: "Edit note 1 E♯4" })).toBeVisible();
  await page.getByLabel("Score title").fill(title);
  await page.getByRole("button", { name: "Save and practice" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  const context = await browser.newContext({ baseURL, storageState: await page.context().storageState() });
  try {
    const other = await context.newPage();
    await other.goto("/sightstring");
    const saved = other.getByRole("region", { name: title });
    await expect(saved).toBeVisible();
    const downloadEvent = other.waitForEvent("download");
    await saved.getByRole("link", { name: "Download image" }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe(`${title} - page 1.jpg`);
    const bytes = await readFile((await download.path())!);
    expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
    const dimensions = await other.evaluate(async (data) => {
      const image = await createImageBitmap(new Blob([Uint8Array.from(data)], { type: "image/jpeg" }));
      return [image.width, image.height];
    }, [...bytes]);
    expect(dimensions).toEqual([900, 400]);

    await saved.getByRole("button", { name: "Rescan", exact: true }).click();
    await other.getByRole("button", { name: "Rescan saved photos" }).click();
    await expect(other.getByRole("button", { name: "Edit note 1 E4" })).toBeVisible();
    await other.getByRole("button", { name: "Back to scores" }).click();
    await saved.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(other.getByRole("button", { name: "Edit note 1 E♯4" })).toBeVisible();
    await other.getByRole("button", { name: "Back to scores" }).click();

    await saved.getByRole("button", { name: "Rescan", exact: true }).click();
    const chooser = other.waitForEvent("filechooser");
    await other.getByRole("button", { name: "Choose replacement photos" }).click();
    await (await chooser).setFiles(await printedPage(other, 2));
    await expect(other.getByText("2 notes", { exact: true })).toBeVisible();
    await other.getByRole("button", { name: "Save and practice" }).click();
    await expect(other.getByRole("heading", { name: title })).toBeVisible();
    await other.reload();
    await expect(saved).toHaveCount(1);
    await expect(saved.getByText("2 notes", { exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("copies scores from this browser’s old library into object storage", async ({ page, browser, baseURL }) => {
  const title = `Local study ${crypto.randomUUID()}`;
  await page.goto("/sightstring");
  await page.evaluate(async (title) => {
    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 180;
    const score = {
      id: crypto.randomUUID(), title, key: 0,
      staves: [{
        image: canvas.toDataURL("image/jpeg"), width: 500, height: 180, left: 10, right: 490, top: 40, spacing: 12,
        notes: [{ id: crypto.randomUUID(), x: 100, y: 65, step: 6, accidental: null, hollow: false }],
      }],
    };
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open("sightstring", 1);
      open.onupgradeneeded = () => open.result.createObjectStore("scores", { keyPath: "id" });
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const transaction = db.transaction("scores", "readwrite");
        transaction.objectStore("scores").put(score);
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => { db.close(); reject(transaction.error); };
      };
    });
  }, title);
  await page.reload();
  const migrated = page.getByRole("region", { name: title }).getByRole("link", { name: "Download image" });
  await expect(migrated).toHaveAttribute("href", /^\/api\/sightstring\//);

  const context = await browser.newContext({ baseURL, storageState: await page.context().storageState() });
  try {
    const other = await context.newPage();
    await other.goto("/sightstring");
    await expect(other.getByRole("region", { name: title })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("keeps tracks, lines, and appended photos in order", async ({ page }) => {
  await page.goto("/sightstring");
  const data = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 680;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "white";
    context.fillRect(0, 0, 900, 680);
    context.fillStyle = "black";
    for (const top of [65, 200, 366, 501]) {
      for (let line = 0; line < 5; line++) context.fillRect(50, top + line * 18 - 1, 800, 2);
      for (const x of [180, 350, 540]) {
        const y = top + 54;
        context.beginPath();
        context.ellipse(x, y, 12, 8.5, -0.28, 0, Math.PI * 2);
        context.fill();
        context.fillRect(x + 10, y - 54, 2.5, 54);
      }
    }
    for (const top of [65, 366]) {
      for (const x of [50, 420, 849]) context.fillRect(x, top, 2, 207);
    }
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const second = await printedPage(page);
  await page.getByLabel("Upload score photos").setInputFiles([
    { name: "paired-staves.png", mimeType: "image/png", buffer: Buffer.from(data, "base64") }, second,
  ]);

  await expect(page.getByText("Staff 1 of 5")).toBeVisible();
  await expect(page.getByText("Page 1 · Line 1 · Track 1")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 1 · Line 1 · Track 2")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 1 · Line 2 · Track 1")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 1 · Line 2 · Track 2")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2 · Line 1 · Track 1")).toBeVisible();

  await page.getByLabel("Upload additional score photos").setInputFiles(second);
  await expect(page.getByText("Page 3 · Line 1 · Track 1")).toBeVisible();
  const title = `Duet ${crypto.randomUUID()}`;
  await page.getByLabel("Score title").fill(title);
  await page.getByRole("button", { name: "Save and practice" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByRole("region", { name: /track 1$/ })).toHaveCount(4);
  await page.getByLabel("Practice track").selectOption("2");
  await expect(page.getByRole("region", { name: /track 2$/ })).toHaveCount(2);
  await expect(page.getByRole("region", { name: /track 1$/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Back to scores" }).click();
  const saved = page.getByRole("region", { name: title });
  await expect(saved.getByRole("link", { name: /^Download page/ })).toHaveCount(3);
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
  await page.getByRole("button", { name: "Practice Open String Study", exact: true }).click();
  await page.getByRole("button", { name: "Start listening" }).click();
  await expect(page.getByText("1 of 16 notes played")).toBeVisible();
  await expect(page.locator('[data-note="demo-0-0"]')).toHaveAttribute("data-status", "correct");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByText("Play at your own pace")).toBeVisible();
});

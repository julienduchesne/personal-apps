import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { exerciseStaff, type Score } from "../app/sightstring/score";

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

test("searches and sorts saved scores separately from practice exercises", async ({ page }) => {
  const saved = [["Prelude", 5], ["Étude 10", 2], ["Étude 2", 8]] as const;
  const scores: Score[] = saved.map(([title, count]) => {
    const id = crypto.randomUUID();
    return {
      id, title, key: 0, generated: true,
      staves: [exerciseStaff(id, Array.from({ length: count }, () => ({ step: 2, accidental: null })))],
    };
  });
  await page.route("**/api/sightstring", (route) => route.fulfill({ json: scores }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sightstring");

  const importer = page.getByRole("region", { name: "Import a score" });
  await expect(importer.getByRole("button", { name: "Choose photos" })).toBeVisible();
  await expect(importer.locator("[data-score-view]")).toHaveCount(0);
  const library = page.getByRole("region", { name: "Your scores" });
  const exercises = page.getByRole("region", { name: "Practice exercises" });
  const titles = library.getByRole("listitem").locator("strong");
  const search = library.getByRole("searchbox", { name: "Search scores" });
  const sort = library.getByLabel("Sort by");
  await expect(titles).toHaveText(["Étude 2", "Étude 10", "Prelude"]);
  await expect(library.getByText("Open String Study")).toHaveCount(0);
  await expect(library.getByText("Random sightreading")).toHaveCount(0);
  await expect(exercises.getByRole("button", { name: "Set up random sightreading" })).toBeVisible();

  await sort.selectOption("title-desc");
  await expect(titles).toHaveText(["Prelude", "Étude 10", "Étude 2"]);
  await sort.selectOption("notes-desc");
  await expect(titles).toHaveText(["Étude 2", "Prelude", "Étude 10"]);
  await sort.selectOption("notes-asc");
  await expect(titles).toHaveText(["Étude 10", "Prelude", "Étude 2"]);
  await search.fill("ETUDE");
  await expect(titles).toHaveText(["Étude 10", "Étude 2"]);
  await search.fill("missing");
  await expect(library.getByRole("status")).toHaveText("No scores match your search.");
  await exercises.getByRole("button", { name: "Practice Open String Study" }).click();
  await page.getByRole("button", { name: "Back to scores" }).click();
  await expect(search).toHaveValue("missing");
  await expect(sort).toHaveValue("notes-asc");
});

test("shows spinners while saved scores and practice history load", async ({ page }) => {
  async function pauseResponse(url: string) {
    let finish!: () => void;
    const ready = new Promise<void>((resolve) => { finish = resolve; });
    await page.route(url, async (route) => {
      await ready;
      await route.fulfill({ json: [] });
    });
    return finish;
  }
  const showScores = await pauseResponse("**/api/sightstring");
  const showAttempts = await pauseResponse("**/api/sightstring/open-strings/attempts/1");
  try {
    await page.goto("/sightstring");
    const library = page.getByRole("region", { name: "Your scores" });
    const scoreStatus = library.getByRole("status").filter({ hasText: "Loading scores" });
    await expect(scoreStatus.locator('[aria-hidden="true"]')).toBeVisible();
    showScores();
    await expect(library.getByText("No saved scores yet.")).toBeVisible();
    await expect(scoreStatus).toHaveCount(0);

    await page.getByRole("button", { name: "Practice Open String Study" }).click();
    const history = page.getByRole("region", { name: "Best times" });
    const historyStatus = history.getByRole("status").filter({ hasText: "Loading best times" });
    await expect(historyStatus.locator('[aria-hidden="true"]')).toBeVisible();
    showAttempts();
    await expect(history.getByText("No completed attempts yet.")).toBeVisible();
    await expect(historyStatus).toHaveCount(0);
  } finally {
    showScores();
    showAttempts();
  }
});

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

test("transcribes all 85 written pitches in the Moorish Dance photo", async ({ page }) => {
  const expected = [
    "E3 E4 E3 E4 | E3 E4 E4 E3 E4 | F3 G3 A3 C4 B3 A3 G3 F3 | E3 E4 E4 E3 E4",
    "F3 G3 A3 C4 B3 A3 G3 F3 | E3 E4 E4 E3 E4 | A3 B3 C4 B3 D4 C4 B3 C4 | A3 E4 E4 A3 E4 | A3 B3 C4 B3 D4 C4 B3 A3",
    "G3 D4 D4 G3 D4 | G3 A3 B3 D4 C4 B3 A3 G3 | F3 C4 C4 F3 C4 | F3 G3 A3 C4 B3 A3 G3 F3 | E3 E4 E3",
  ];
  const durations = [
    "qqqq qeeqq eeeeeeee qeeqq",
    "eeeeeeee qeeqq eeeeeeee qeeqq eeeeeeee",
    "qeeqq eeeeeeee qeeqq eeeeeeee qqh",
  ];

  await page.goto("/sightstring");
  await page.getByLabel("Upload score photos").setInputFiles(resolve(__dirname, "fixtures", "IMG_4218.jpeg"));
  await expect(page.getByRole("heading", { name: "Review scan" })).toBeVisible();
  await expect(page.getByLabel("Beats per measure")).toHaveValue("4");
  await expect(page.getByLabel("Beat unit")).toHaveValue("4");
  const notes = page.getByRole("button", { name: /^Edit note \d+ / });
  const next = page.getByRole("button", { name: "Next", exact: true });
  for (const [index, line] of expected.entries()) {
    const number = index + 1;
    await expect(page.getByText(`Staff ${number} of ${expected.length}`)).toBeVisible();
    await expect(page.getByText(`Page 1 · Line ${number} · Track 1`)).toBeVisible();
    await expect(notes, `Written pitches on line ${number}`).toHaveText(line.split(/[\s|]+/));
    const rhythm = await page.locator("[data-note]").evaluateAll((marks) =>
      marks.map((mark) => mark.getAttribute("data-duration")).map((duration) => {
        if (duration === "0.5") return "e";
        if (duration === "1") return "q";
        if (duration === "2") return "h";
        return "?";
      }).join(""));
    expect(rhythm, `Note lengths on line ${number}`).toEqual(durations[index].replaceAll(" ", ""));
    if (number < expected.length) await next.click();
  }
  await expect(next).toBeDisabled();
  await page.getByLabel("Beats per measure").fill("3");
  await page.getByLabel("Beat unit").selectOption("8");
  const savedScore = page.waitForRequest((request) => request.method() === "PUT"
    && /\/api\/sightstring\/[a-f0-9-]+$/.test(request.url()));
  await page.getByRole("button", { name: "Save and practice" }).click();
  await expect(page.getByText("Time signature 3/8")).toBeVisible();
  const saved = (await savedScore).postDataJSON() as {
    staves: { barlines: number[]; notes: { x: number; beam?: { count: number } }[] }[];
  };
  for (const [index, { barlines, notes: heads }] of saved.staves.entries()) {
    const boundaries = [-Infinity, ...barlines, Infinity];
    const counts = boundaries.slice(1).map((end, measure) =>
      heads.filter(({ x }) => x >= boundaries[measure] && x < end).length);
    expect(counts, `Measure breaks on line ${index + 1}`).toEqual(expected[index].split(" | ").map((bar) => bar.split(" ").length));
    expect(heads.filter(({ beam }) => beam?.count === 1)).toHaveLength([8, 20, 14][index]);
  }
  await page.getByLabel("Score view").selectOption("notation");
  const current = page.locator('[data-practice-line="current"]');
  const nextLine = page.locator('[data-practice-line="next"]');
  await expect(current.locator("[data-measure-bar]")).toHaveCount(3);
  await expect(nextLine.locator("[data-measure-bar]")).toHaveCount(4);
  await expect(current.locator('[data-beam-count="1"]')).toHaveCount(8);
});

test("detects multiple beams and renders their note lengths and measure breaks", async ({ page }) => {
  await page.goto("/sightstring");
  const data = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 400;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 900, 400);
    ctx.fillStyle = "black";
    for (let line = 0; line < 5; line++) ctx.fillRect(45, 120 + line * 20, 810, 2);
    for (const x of [310, 620, 854]) ctx.fillRect(x, 120, 2, 81);
    for (const [count, xs] of [[2, [175, 235]], [4, [365, 425, 485, 545]], [3, [685, 745]]] as const) {
      for (const x of xs) {
        ctx.beginPath();
        ctx.ellipse(x, 170, 13, 9, -0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x + 10, 95, 3, 75);
      }
      for (let level = 0; level < count; level++) {
        ctx.fillRect(xs[0] + 10, 95 + level * 9, xs.at(-1)! - xs[0] + 3, 6);
      }
    }
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.getByLabel("Upload score photos").setInputFiles({
    name: "fast-notes.png", mimeType: "image/png", buffer: Buffer.from(data, "base64"),
  });
  await expect(page.getByRole("heading", { name: "Review scan" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Edit note/ })).toHaveText(Array(8).fill("A4"));
  const notes = page.locator("[data-note]");
  expect(await notes.evaluateAll((marks) => marks.map((mark) => Number(mark.getAttribute("data-duration")))))
    .toEqual([0.25, 0.25, 0.0625, 0.0625, 0.0625, 0.0625, 0.125, 0.125]);
  await page.getByRole("button", { name: "Save and practice" }).click();
  await page.getByLabel("Score view").selectOption("notation");
  await expect(page.locator("[data-measure-bar]")).toHaveCount(2);
  await expect(page.locator('[data-beam-count="2"] line')).toHaveCount(2);
  await expect(page.locator('[data-beam-count="4"] line')).toHaveCount(12);
  await expect(page.locator('[data-beam-count="3"] line')).toHaveCount(3);
});

test("plays a scanned score with a manually entered time signature", async ({ page }) => {
  const title = `Meter practice ${crypto.randomUUID()}`;
  await page.goto("/sightstring");
  await page.getByLabel("Upload score photos").setInputFiles(await printedPage(page));
  await expect(page.getByRole("heading", { name: "Review scan" })).toBeVisible();
  await expect(page.getByLabel("Beats per measure")).toHaveValue("");
  await page.getByLabel("Beats per measure").fill("2");
  await page.getByLabel("Beat unit").selectOption("8");
  await page.getByLabel("Score title").fill(title);
  await page.getByRole("button", { name: "Save and practice" }).click();
  await expect(page.getByText("Time signature 2/8")).toBeVisible();
  await page.getByLabel("Score view").selectOption("notation");
  await expect(page.locator("[data-meter-digit]")).toHaveText(["2", "8"]);

  await page.getByRole("button", { name: "Play score" }).click();
  await expect(page.getByText("Counting in")).toBeVisible();
  await expect(page.getByText("Playing score", { exact: true })).toBeVisible();
  await expect(page.locator('[data-status="current"]')).toHaveCount(1);
  await page.getByRole("button", { name: "Stop playback" }).click();
  await expect(page.getByText("0 of 3 notes played")).toBeVisible();
  await expect(page.getByRole("region", { name: "Best times" }).getByText("No completed attempts yet.")).toBeVisible();
  await page.getByRole("button", { name: "Back to scores" }).click();
  await page.getByRole("region", { name: title }).getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByLabel("Beats per measure")).toHaveValue("2");
  await expect(page.getByLabel("Beat unit")).toHaveValue("8");
});

test("saves a score and its photo across browsers and supports downloading and rescanning", async ({ page, browser, baseURL }) => {
  const title = `Printed exercise ${crypto.randomUUID()}`;
  await page.goto("/sightstring");
  await page.getByLabel("Upload score photos").setInputFiles(await printedPage(page));
  await expect(page.getByRole("heading", { name: "Review scan" })).toBeVisible();
  await expect(page.getByText("3 notes", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit note 1 E4" }).click();
  await page.getByLabel("Accidental").selectOption("1");
  await page.getByLabel("Fingering").selectOption("3");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("button", { name: "Edit note 1 E♯4" })).toBeVisible();
  await page.getByLabel("Score title").fill(title);
  await page.getByRole("button", { name: "Save and practice" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  const current = page.locator('[data-practice-line="current"]');
  const view = page.getByLabel("Score view");
  const fingers = page.getByRole("checkbox", { name: "Show fingering" });
  await expect(view).toHaveValue("photo");
  await expect(current.locator('[data-score-view="photo"]')).toBeVisible();
  await view.selectOption("notation");
  await expect(current.locator('[data-score-view="notation"] [data-clef]')).toBeVisible();
  await expect(current.locator('[data-status="current"]')).toHaveCount(1);
  await fingers.check();
  await expect(current.locator('[data-status="current"] [data-finger="3"]')).toHaveText("3");
  await view.selectOption("photo");
  await expect(current.locator('[data-score-view="photo"] [data-finger="3"]').first()).toBeVisible();
  await fingers.uncheck();
  await expect(current.locator("[data-finger]")).toHaveCount(0);
  const context = await browser.newContext({ baseURL, storageState: await page.context().storageState() });
  try {
    const other = await context.newPage();
    await other.goto("/sightstring");
    const saved = other.getByRole("region", { name: title });
    await expect(saved).toBeVisible();
    await expect(saved.getByText("Rescan", { exact: true })).toHaveCount(0);
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

    await saved.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(other.getByRole("heading", { name: "Edit score" })).toBeVisible();
    await other.getByText("Rescan", { exact: true }).click();
    await other.getByRole("button", { name: "Rescan saved photos" }).click();
    await expect(other.getByRole("button", { name: "Edit note 1 E4" })).toBeVisible();
    await other.getByRole("button", { name: "Back to scores" }).click();
    await saved.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(other.getByRole("button", { name: "Edit note 1 E♯4" })).toBeVisible();
    const replacement = await printedPage(other, 2);
    await other.getByText("Rescan", { exact: true }).click();
    const [chooser] = await Promise.all([
      other.waitForEvent("filechooser"),
      other.getByRole("button", { name: "Choose replacement photos" }).click(),
    ]);
    await chooser.setFiles(replacement);
    await expect(other.getByRole("heading", { name: "Edit score" })).toBeVisible();
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

test("deletes a scanned score from Edit only after confirmation", async ({ page }) => {
  const title = `Delete scan ${crypto.randomUUID()}`;
  await page.goto("/sightstring");
  await page.getByLabel("Upload score photos").setInputFiles(await printedPage(page));
  await expect(page.getByRole("button", { name: "Delete score" })).toHaveCount(0);
  await page.getByLabel("Score title").fill(title);
  await page.getByRole("button", { name: "Save and practice" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.getByRole("button", { name: "Back to scores" }).click();
  const saved = page.getByRole("region", { name: title });
  const image = (await saved.getByRole("link", { name: "Download image" }).getAttribute("href"))!;
  await saved.getByRole("button", { name: "Edit", exact: true }).click();
  const deleteButton = page.getByRole("button", { name: "Delete score" });
  page.once("dialog", (dialog) => dialog.dismiss());
  await deleteButton.click();
  await expect(page.getByRole("heading", { name: "Edit score" })).toBeVisible();
  expect((await page.request.get(image)).ok()).toBe(true);
  page.once("dialog", (dialog) => dialog.accept());
  await deleteButton.click();
  await expect(page.getByRole("heading", { name: "Your scores" })).toBeVisible();
  await expect(saved).toHaveCount(0);
  expect((await page.request.get(image)).status()).toBe(410);
  await page.reload();
  const scores = await page.request.get("/api/sightstring");
  expect((await scores.json()).some((score: { title: string }) => score.title === title)).toBe(false);
  await expect(saved).toHaveCount(0);
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
    const saved = other.getByRole("region", { name: title });
    await saved.getByRole("button", { name: "Edit", exact: true }).click();
    other.once("dialog", (dialog) => dialog.accept());
    await other.getByRole("button", { name: "Delete score" }).click();
    await expect(other.getByRole("heading", { name: "Your scores" })).toBeVisible();
    const blocked = page.waitForResponse((response) => response.request().method() === "PUT"
      && response.url().includes("/api/sightstring/") && response.status() === 410);
    await page.reload();
    await blocked;
    await expect(migrated).toHaveCount(0);
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
  await expect(page.getByRole("region", { name: /track 1$/ })).toHaveCount(2);
  await expect(page.getByRole("region", { name: "Page 1, line 1, track 1" })).toHaveAttribute("data-practice-line", "current");
  await expect(page.getByRole("region", { name: "Page 1, line 2, track 1" })).toHaveAttribute("data-practice-line", "next");
  await page.getByLabel("Practice track").selectOption("2");
  await expect(page.getByRole("region", { name: /track 2$/ })).toHaveCount(2);
  await expect(page.getByRole("region", { name: /track 1$/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Back to scores" }).click();
  const saved = page.getByRole("region", { name: title });
  await expect(saved.getByRole("link", { name: /^Download page/ })).toHaveCount(3);
});

test("shows solfège prompts and turns notes green when microphone audio matches", async ({ page }) => {
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
        amplitude.gain.value = 0;
        window.addEventListener("sightstring-test-tone", (event) => {
          string.frequency.value = (event as CustomEvent<number>).detail;
          amplitude.gain.value = 0.12;
        });
        string.connect(amplitude).connect(destination);
        string.start();
        return destination.stream;
      },
    });
  });
  await page.goto("/sightstring");
  await page.getByRole("button", { name: "Practice Open String Study", exact: true }).click();
  const current = page.locator('[data-practice-line="current"]');
  const preview = page.locator('[data-practice-line="next"]');
  const timer = page.getByRole("timer", { name: "Elapsed time" });
  await expect(current).toHaveAttribute("aria-label", "Staff 1");
  await expect(preview).toHaveAttribute("aria-label", "Staff 2");
  const fingers = page.getByRole("checkbox", { name: "Show fingering" });
  await expect(current.locator("[data-finger]")).toHaveCount(0);
  await fingers.check();
  await expect(current.locator('[data-note="demo-0-0"] [data-finger="0"]')).toHaveText("0");
  await fingers.uncheck();
  await page.getByRole("button", { name: "Start listening" }).click();
  await expect(page.getByText("Play · Mi (E3)", { exact: true })).toBeVisible();
  await expect(timer).toHaveCount(0);
  const play = (frequency: number) => page.evaluate((value) => {
    window.dispatchEvent(new CustomEvent("sightstring-test-tone", { detail: value }));
  }, frequency);
  await play(82.4069);
  await expect(page.getByText("1 of 16 notes played")).toBeVisible();
  await expect(timer).toHaveText(/^\d+\.\d s$/);
  const initialTime = await timer.innerText();
  await expect(timer).not.toHaveText(initialTime);
  await expect(page.locator('[data-note="demo-0-0"]')).toHaveAttribute("data-status", "correct");
  await expect(page.getByText("Play · La (A3)", { exact: true })).toBeVisible();
  await play(110);
  await expect(page.getByText("Play · Ré (D4)", { exact: true })).toBeVisible();
  await play(146.8324);
  await expect(page.getByText("Play · Sol (G4)", { exact: true })).toBeVisible();
  for (const [index, frequency] of [195.9977, 246.9417, 329.6276, 246.9417, 195.9977].entries()) {
    await play(frequency);
    await expect(page.getByText(`${index + 4} of 16 notes played`)).toBeVisible();
  }
  await expect(current).toHaveAttribute("aria-label", "Staff 2");
  await expect(preview).toHaveCount(0);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByText("Play at your own pace")).toBeVisible();
});

test("recognizes a quick quieter note while the first string is still ringing", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        const context = new AudioContext();
        await context.resume();
        const destination = context.createMediaStreamDestination();
        window.addEventListener("sightstring-test-quick-plucks", () => {
          const now = context.currentTime + 0.02;
          for (const [frequency, volume, onset] of [[82.4069, 0.25, 0], [110, 0.08, 0.085]]) {
            const string = context.createOscillator();
            const amplitude = context.createGain();
            string.frequency.value = frequency;
            amplitude.gain.value = volume;
            string.connect(amplitude).connect(destination);
            string.start(now + onset);
            string.stop(now + 0.5);
          }
        }, { once: true });
        return destination.stream;
      },
    });
  });
  await page.goto("/sightstring");
  await page.getByRole("button", { name: "Practice Open String Study", exact: true }).click();
  await page.getByRole("button", { name: "Start listening" }).click();
  await expect(page.getByText("Play · Mi (E3)", { exact: true })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("sightstring-test-quick-plucks")));
  await expect(page.getByText("Play · Ré (D4)", { exact: true })).toBeVisible();
  await expect(page.getByText("2 of 16 notes played")).toBeVisible();
});

test("practices an optional bass and melody pair in the same beat", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        const context = new AudioContext();
        await context.resume();
        const destination = context.createMediaStreamDestination();
        window.addEventListener("sightstring-test-pair", () => {
          const now = context.currentTime + 0.02;
          for (const frequency of [82.4069, 195.9977]) {
            const string = context.createOscillator();
            const amplitude = context.createGain();
            string.frequency.value = frequency;
            amplitude.gain.value = 0.12;
            string.connect(amplitude).connect(destination);
            string.start(now);
            string.stop(now + 0.5);
          }
        }, { once: true });
        return destination.stream;
      },
    });
  });

  await page.goto("/sightstring");
  await page.getByRole("button", { name: "Set up random sightreading" }).click();
  const strings = page.getByRole("group", { name: "Strings" }).getByRole("checkbox");
  for (const string of (await strings.all()).slice(1)) await string.uncheck();
  await page.getByLabel("Last fret").selectOption("0");

  const withBass = page.getByRole("checkbox", { name: "Bass and melody together" });
  const generate = page.getByRole("button", { name: "Generate exercise" });
  await expect(withBass).not.toBeChecked();
  await expect(generate).toBeEnabled();
  await withBass.check();
  await expect(generate).toBeDisabled();
  await page.getByRole("checkbox", { name: "String 5 (A)" }).check();
  await expect(generate).toBeDisabled();
  await page.getByRole("checkbox", { name: "String 5 (A)" }).uncheck();
  await page.getByRole("checkbox", { name: "String 3 (G)" }).check();
  const melodyNotes = page.getByLabel("Number of melody notes");
  await expect(melodyNotes).toHaveValue("40");
  await melodyNotes.fill("4");
  await generate.click();
  await expect(page.getByText("0 of 6 notes played")).toBeVisible();
  await page.getByRole("button", { name: "Start listening" }).click();
  await expect(page.getByText("Play together · Mi (E3), Sol (G4)", { exact: true })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("sightstring-test-pair")));
  await expect(page.getByText("2 of 6 notes played")).toBeVisible();
  await expect(page.locator('[data-status="correct"]')).toHaveCount(2);
});

test("generates a playable random exercise for open strings and fret 18", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        const audio = new AudioContext();
        await audio.resume();
        const destination = audio.createMediaStreamDestination();
        window.addEventListener("sightstring-test-play-note", (event) => {
          const oscillator = audio.createOscillator();
          const gain = audio.createGain();
          oscillator.frequency.value = (event as CustomEvent<number>).detail;
          gain.gain.value = 0.12;
          oscillator.connect(gain).connect(destination);
          oscillator.start();
          oscillator.stop(audio.currentTime + 0.25);
        });
        return destination.stream;
      },
    });
  });

  await page.goto("/sightstring");
  await page.getByRole("button", { name: "Set up random sightreading" }).click();
  const strings = page.getByRole("group", { name: "Strings" }).getByRole("checkbox");
  for (const string of await strings.all()) await string.uncheck();
  await expect(page.getByRole("button", { name: "Generate exercise" })).toBeDisabled();
  await page.getByRole("checkbox", { name: "String 1 (High E)" }).check();
  await page.getByLabel("Last fret").selectOption("0");
  await expect(page.getByLabel("First fret")).toHaveValue("0");
  await page.getByRole("button", { name: "Generate exercise" }).click();
  await expect(page.getByText("0 of 40 notes played")).toBeVisible();
  await page.getByRole("button", { name: "Start listening" }).click();
  await expect(page.getByText("Play · Mi (E5)", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Practice settings" }).click();
  await expect(page.getByRole("checkbox", { name: "String 1 (High E)" })).toBeChecked();
  await page.getByLabel("Last fret").selectOption("18");
  await page.getByLabel("First fret").selectOption("18");
  await page.getByRole("checkbox", { name: "Allow sharps and flats" }).check();
  await page.getByRole("button", { name: "Generate exercise" }).click();
  await page.getByRole("button", { name: "Start listening" }).click();
  await expect(page.getByText("Play · Si♭ (B♭6)", { exact: true })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("sightstring-test-play-note", { detail: 932.328 })));
  await expect(page.getByText("1 of 40 notes played")).toBeVisible();
  await page.getByRole("button", { name: "New exercise" }).click();
  await expect(page.getByText("0 of 40 notes played")).toBeVisible();
  await page.getByRole("button", { name: "Save exercise" }).click();
  await expect(page.getByLabel("Score title")).toHaveValue(/ — Sightreading, fret 18$/);
  await page.getByRole("button", { name: "Save to library" }).click();
  await expect(page.getByText("Exercise saved to your scores.")).toBeVisible();
  await page.getByRole("button", { name: "New exercise" }).click();
  await page.getByRole("button", { name: "Practice settings" }).click();
  await expect(page.getByLabel("First fret")).toHaveValue("18");
  await expect(page.getByLabel("Last fret")).toHaveValue("18");
});

test("saves a generated exercise with its best times across visits", async ({ page }) => {
  await page.addInitScript(() => {
    let pluck: (frequency: number) => void;
    window.addEventListener("sightstring-test-timed-note", (event) => pluck?.((event as CustomEvent<number>).detail));
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        const audio = new AudioContext();
        await audio.resume();
        const destination = audio.createMediaStreamDestination();
        pluck = (frequency) => {
          const oscillator = audio.createOscillator();
          const gain = audio.createGain();
          oscillator.frequency.value = frequency;
          gain.gain.value = 0.12;
          oscillator.connect(gain).connect(destination);
          oscillator.start();
          oscillator.stop(audio.currentTime + 0.24);
        };
        return destination.stream;
      },
    });
  });

  const title = `Two-note practice ${crypto.randomUUID()}`;
  await page.goto("/sightstring");
  await page.getByRole("button", { name: "Set up random sightreading" }).click();
  const strings = page.getByRole("group", { name: "Strings" }).getByRole("checkbox");
  for (const string of (await strings.all()).slice(2)) await string.uncheck();
  await page.getByLabel("Last fret").selectOption("0");
  await page.getByLabel("Number of notes").fill("2");
  await page.getByRole("button", { name: "Generate exercise" }).click();

  const leaderboard = page.getByRole("region", { name: "Best times" });
  const times = leaderboard.getByRole("listitem").locator("strong");
  const play = (frequency: number) => page.evaluate((value) => {
    window.dispatchEvent(new CustomEvent("sightstring-test-timed-note", { detail: value }));
  }, frequency);
  const playExercise = async (gap: number) => {
    await page.getByRole("button", { name: "Start listening" }).click();
    await expect(page.getByText("Play · Mi (E3)", { exact: true })).toBeVisible();
    await play(82.4069);
    await expect(page.getByText("Play · La (A3)", { exact: true })).toBeVisible();
    await page.waitForTimeout(gap);
    const saved = page.waitForResponse((response) => response.request().method() === "PUT"
      && response.url().includes("/attempts/") && response.status() === 204);
    await play(110);
    await expect(page.getByText("Score complete", { exact: true })).toBeVisible();
    await expect(page.getByRole("timer")).toHaveCount(0);
    await saved;
  };
  await expect(leaderboard.getByText("No completed attempts yet.")).toBeVisible();
  await playExercise(600);
  await expect(times).toHaveCount(1);
  const first = await times.first().innerText();
  expect(parseFloat(first)).toBeGreaterThan(0.5);
  await page.getByRole("button", { name: "Play again" }).click();
  await playExercise(30);
  await expect(times).toHaveCount(2);
  const best = await times.first().innerText();
  expect(parseFloat(best)).toBeLessThan(parseFloat(first));

  await page.getByRole("button", { name: "Save exercise" }).click();
  await expect(page.getByLabel("Score title")).toHaveValue(/ — Sightreading, open strings$/);
  await page.getByLabel("Score title").fill(title);
  await page.getByRole("button", { name: "Save to library" }).click();
  await expect(page.getByText("Exercise saved to your scores.")).toBeVisible();
  await page.reload();
  await page.getByRole("region", { name: title }).getByRole("button", { name: "Practice", exact: true }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(times).toHaveText([best, first]);
  await page.getByRole("button", { name: "Back to scores" }).click();
  const savedExercise = page.getByRole("region", { name: title });
  await savedExercise.getByRole("button", { name: "Edit", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete score" }).click();
  await expect(page.getByRole("heading", { name: "Your scores" })).toBeVisible();
  await expect(savedExercise).toHaveCount(0);
});

test("can exclude sharps and flats from random sightreading", async ({ page }) => {
  await page.goto("/sightstring");
  await page.getByRole("button", { name: "Set up random sightreading" }).click();
  const strings = page.getByRole("group", { name: "Strings" }).getByRole("checkbox");
  for (const string of (await strings.all()).slice(0, 5)) await string.uncheck();
  await page.getByLabel("Last fret").selectOption("18");
  await page.getByLabel("First fret").selectOption("18");
  const accidentals = page.getByRole("checkbox", { name: "Allow sharps and flats" });
  const generate = page.getByRole("button", { name: "Generate exercise" });
  await expect(accidentals).not.toBeChecked();
  await expect(generate).toBeDisabled();
  await accidentals.check();
  await expect(generate).toBeEnabled();
  await accidentals.uncheck();
  await expect(generate).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("No natural notes");
  await page.getByLabel("First fret").selectOption("17");
  await page.getByLabel("Number of notes").fill("41");
  await generate.click();
  await expect(page.getByText("0 of 41 notes played")).toBeVisible();
  await page.getByRole("button", { name: "Practice settings" }).click();
  await expect(accidentals).not.toBeChecked();
  await expect(page.getByLabel("Number of notes")).toHaveValue("41");
});

test("aligns the treble clef with the G line on mobile and desktop", async ({ page }) => {
  await page.goto("/sightstring");
  await page.getByRole("button", { name: "Practice Open String Study", exact: true }).click();
  const clef = page.locator('[data-clef="treble"]').first();
  await expect(clef).toHaveCSS("background-image", /treble-clef\.png/);
  const image = await page.request.get("/sightstring/treble-clef.png");
  expect(image.ok()).toBe(true);
  expect(image.headers()["content-type"]).toContain("image/png");

  for (const width of [390, 1100]) {
    await page.setViewportSize({ width, height: 844 });
    const anchorError = await clef.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const gLine = element.parentElement!.querySelector('[data-staff-line="3"]')!.getBoundingClientRect();
      return Math.abs(box.top + box.height * (4.5 / 7.5) - gLine.top);
    });
    expect(anchorError).toBeLessThan(1);
  }
});

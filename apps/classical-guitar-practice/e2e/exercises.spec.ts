import { test, expect } from "@playwright/test";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = "guitar-practice-test";
const EXERCISES_KEY = "data/exercises.json";

function makeClient() {
  return new S3Client({
    endpoint: "http://localhost:9000",
    region: "us-east-1",
    credentials: { accessKeyId: "minioadmin", secretAccessKey: "minioadmin" },
    forcePathStyle: true,
  });
}

const SEED_EXERCISES = [
  { id: "test-1", name: "Test Arpeggio", category: "right_hand", focus: "Basic arpeggio" },
  { id: "test-2", name: "Test Spider", category: "left_hand", focus: "Finger independence" },
  { id: "test-3", name: "Test Scale", category: "coordination_scales", focus: "C major" },
  { id: "test-4", name: "Test Vibrato", category: "specialized", focus: "Wide vibrato" },
];

async function seedExercises() {
  const s3 = makeClient();
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: EXERCISES_KEY,
      Body: JSON.stringify(SEED_EXERCISES),
      ContentType: "application/json",
    })
  );
}

async function clearExercises() {
  const s3 = makeClient();
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: EXERCISES_KEY }));
  } catch {
    // ignore
  }
}

test.describe("Exercises page", () => {
  // Run serially to avoid conflicts with S3 state
  test.describe.configure({ mode: "serial" });

  test("shows heading and add button", async ({ page }) => {
    await page.goto("/exercises");
    await expect(page.getByRole("heading", { name: "Exercises", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "+" })).toBeVisible();
  });

  test("add modal opens and shows form fields", async ({ page }) => {
    await page.goto("/exercises?add=1");
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByLabel("Category")).toBeVisible();
    await expect(page.getByLabel("Focus")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add exercise" })).toBeVisible();
  });

  test("add modal closes via close button", async ({ page }) => {
    await page.goto("/exercises?add=1");
    await expect(page.getByLabel("Name")).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByLabel("Name")).not.toBeVisible();
  });

  test("shows empty state when no exercises", async ({ page }) => {
    await clearExercises();
    await page.goto("/exercises");
    await expect(page.getByText("No exercises yet")).toBeVisible();
  });

  test("shows category sections with seeded exercises", async ({ page }) => {
    await seedExercises();
    await page.goto("/exercises");
    await expect(page.getByRole("heading", { name: /Right Hand/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Left Hand/ })).toBeVisible();
    await expect(page.getByText("Test Arpeggio")).toBeVisible();
  });

  test("each exercise has an Edit link", async ({ page }) => {
    await seedExercises();
    await page.goto("/exercises");
    await expect(page.getByText("Test Arpeggio")).toBeVisible();
    const editLinks = page.getByRole("link", { name: "Edit" });
    await expect(editLinks.first()).toBeVisible();
    const count = await editLinks.count();
    expect(count).toBe(4);
  });

  test("edit modal opens with all fields", async ({ page }) => {
    await seedExercises();
    await page.goto("/exercises");
    await expect(page.getByText("Test Arpeggio")).toBeVisible();
    await page.getByRole("link", { name: "Edit" }).first().click();
    await expect(page).toHaveURL(/[?&]edit=/);
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByLabel("Category")).toBeVisible();
    await expect(page.getByLabel("Focus")).toBeVisible();
    await expect(page.getByLabel("YouTube URL")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
  });

  test("edit modal closes via Escape key", async ({ page }) => {
    await seedExercises();
    await page.goto("/exercises");
    await expect(page.getByText("Test Arpeggio")).toBeVisible();
    await page.getByRole("link", { name: "Edit" }).first().click();
    await expect(page.getByLabel("YouTube URL")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByLabel("YouTube URL")).not.toBeVisible();
  });

  test("each exercise has Upload PDF button", async ({ page }) => {
    await seedExercises();
    await page.goto("/exercises");
    await expect(page.getByText("Test Arpeggio")).toBeVisible();
    const uploadButtons = page.getByRole("button", { name: "Upload PDF" });
    await expect(uploadButtons.first()).toBeVisible();
  });
});

test.describe("Daily pick page", () => {
  test("shows exercise actions when exercises exist", async ({ page }) => {
    await seedExercises();
    await page.goto("/exercises/daily-pick");
    await expect(page.getByRole("heading", { name: "Daily pick" })).toBeVisible();
    const exercises = page.locator("ul li");
    const count = await exercises.count();
    if (count > 0) {
      const uploadButtons = page.getByRole("button", { name: "Upload PDF" });
      await expect(uploadButtons.first()).toBeVisible();
    }
  });
});

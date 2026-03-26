import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { chromium, type FullConfig } from "@playwright/test";
import path from "path";

const BUCKET = "guitar-practice-test";
export const STORAGE_STATE = path.join(__dirname, ".auth-state.json");

function makeClient() {
  return new S3Client({
    endpoint: "http://localhost:9000",
    region: "us-east-1",
    credentials: { accessKeyId: "minioadmin", secretAccessKey: "minioadmin" },
    forcePathStyle: true,
  });
}

export async function ensureBucket() {
  const s3 = makeClient();
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
  }
}

export async function clearSessions() {
  const s3 = makeClient();
  const keysToDelete = [
    "data/playtime-sessions.json",
    "data/exercises.json",
  ];
  await Promise.all(
    keysToDelete.map(async (Key) => {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key }));
      } catch {
        // ignore – file may not exist
      }
    })
  );
}

async function authenticateBrowser(baseURL: string) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseURL}/pieces?password=test-password`);
  await page.waitForURL("**/pieces");
  await context.storageState({ path: STORAGE_STATE });
  await browser.close();
}

export default async function globalSetup(config: FullConfig) {
  await ensureBucket();
  await clearSessions();
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";
  await authenticateBrowser(baseURL);
}

import { defineConfig, devices } from "@playwright/test";
import { STORAGE_STATE } from "./e2e/minio-global-setup";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/playtime-timer.spec.ts",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  globalSetup: "./e2e/minio-global-setup.ts",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
    storageState: STORAGE_STATE,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3001",
    url: "http://localhost:3001",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      S3_ENDPOINT: "http://localhost:9000",
      S3_ACCESS_KEY_ID: "minioadmin",
      S3_SECRET_ACCESS_KEY: "minioadmin",
      S3_BUCKET: "guitar-practice-test",
      S3_REGION: "us-east-1",
      SITE_PASSWORD: "test-password",
    },
  },
});

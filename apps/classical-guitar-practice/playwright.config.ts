import { defineConfig, devices } from "@playwright/test";
import { STORAGE_STATE } from "./e2e/minio-global-setup";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  globalSetup: "./e2e/minio-global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
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
    command: "SITE_PASSWORD=test-password npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
});

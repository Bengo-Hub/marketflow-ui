import { defineConfig, devices } from "@playwright/test";

// Browser smoke tests against a running portal. Defaults to production; set PLAYWRIGHT_BASE_URL
// to point at a preview or a local `next start`. They only read pages and never sign in.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "https://marketflow.codevertexafrica.com",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

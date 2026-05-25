import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./local-networthgui/tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 60000,
  expect: {
    timeout: 30000,
  },
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5173/local-networthgui/",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

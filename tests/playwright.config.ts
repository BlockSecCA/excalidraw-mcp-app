import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["**/*.test.ts"],
  testIgnore: ["unit/**"], // Unit tests run via Vitest
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:3002",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npx serve -l 3002 .",
    port: 3002,
    reuseExistingServer: !process.env.CI,
    cwd: "..", // Serve from project root
  },
});

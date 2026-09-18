import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  reporter: "list",
  use: {
    browserName: "chromium",
    headless: false,
  },
});

import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end scenarios from PRD 12.2 that this module owns:
 * TC-08 (publish, claim, resolve) and TC-09 (a private claim stays private).
 *
 * The dev server runs in demo mode so the tests need no database. The two
 * students are played by switching the `lost_found_viewer` cookie, which the
 * session adapter reads only while `LOST_FOUND_DEMO` is on.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // `channel: "chrome"` uses the browser already installed on the machine.
  // The bundled download is 197 MB and its unpacking trips a libuv bug on this
  // Windows image ("Assertion failed: new_time >= loop->time"), so the suite
  // prefers the stable Chrome channel when it is present.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100/lost-found",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      LOST_FOUND_DEMO_ADMIN: "1",
      LOST_FOUND_UPLOAD_DIR: ".data/e2e-uploads",
    },
  },
});

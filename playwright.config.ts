import { defineConfig, devices } from "@playwright/test";

// Not 3000 — a stray dev server from another local project can already own
// that port, and reuseExistingServer would silently test against it instead.
const PORT = 3200;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // The scan flow uses live getUserMedia(); grant camera permission and feed
    // it a synthetic video source so tests don't need real camera hardware.
    permissions: ["camera"],
    launchOptions: {
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    },
  },
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60_000,
    env: {
      // DATABASE_URL/DIRECT_URL come from .env (Supabase) — Next.js loads
      // that file itself, so we don't hardcode a connection string here.
      SESSION_SECRET: "dev-only-secret-change-me-please-1234567890",
    },
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
    {
      // A mobile viewport on Chromium — not the `devices["iPhone 13"]` preset,
      // which forces the WebKit engine (a separate browser download).
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
});

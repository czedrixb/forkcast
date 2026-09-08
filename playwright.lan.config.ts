import { defineConfig, devices } from "@playwright/test";

// Verifies the scan flow is actually interactive when the dev server is
// reached over a LAN-IP HTTPS origin (npm run dev:https) instead of
// localhost — this is what a phone on the same network hits. Run against an
// already-running `dev:https` server; does not manage its own webServer.
const baseURL = "https://192.168.1.58:3200";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /lan-https\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
    permissions: ["camera"],
    launchOptions: {
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    },
  },
  projects: [
    {
      name: "mobile-lan",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
  ],
});

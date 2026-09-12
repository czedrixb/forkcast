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
      // Forces the deterministic mock vision provider so quota e2e specs
      // (e2e/scan-quota.spec.ts) can hit the real /api/scan route without a
      // real AI key and without real provider cost/flakiness. NOTE:
      // `reuseExistingServer: true` below means a dev server you already
      // started by hand (without this var) will be reused as-is — stop any
      // stray `npm run dev` before running the suite, or these tests will
      // silently hit real providers instead.
      AI_PROVIDER: "mock",
      // Deliberately no STRIPE_SECRET_KEY/STRIPE_PRICE_PRO_*/APP_URL — the
      // suite exercises the "Checkout unavailable" state, which is what a
      // real deployment without Stripe sandbox access shows too. A dummy
      // webhook secret is set so signature *verification* itself (forged
      // signatures rejected with 400) can still be tested without real
      // Stripe webhook delivery — see e2e/paywall.spec.ts.
      STRIPE_WEBHOOK_SECRET: "whsec_e2e_dummy_secret_not_real",
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

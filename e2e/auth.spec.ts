import { test, expect } from "@playwright/test";
import { SignJWT } from "jose";

// These tests exercise the logged-out flows, so they must not reuse the
// demo user's saved storage state from the "setup" project.
test.use({ storageState: { cookies: [], origins: [] } });

test("middleware bounces a logged-out visitor away from /today", async ({ page }) => {
  await page.goto("/today");
  await expect(page).toHaveURL(/\/login/);
});

// Regression: a stale `forkcast_session` cookie (malformed, or a well-signed
// JWT whose DB session row is gone — e.g. after a local DB reset) used to
// send visitors into an infinite /today <-> /login redirect loop. Proxy
// optimistically treated cookie presence as "logged in" and bounced /login
// back to /today, while the layout's real getCurrentUser() check rejected
// the session and redirected back to /login — forever, landing on a blank
// /today page instead of ever reaching /signup or /login.
test.describe("stale session cookie does not trap the visitor on a blank /today", () => {
  test("malformed cookie value", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "forkcast_session",
        value: "not-a-real-jwt",
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto("/");
    await page.getByRole("link", { name: "Get started" }).click();

    await expect(page).toHaveURL(/\/signup/);
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  });

  test("valid JWT pointing at a session the DB no longer has", async ({ page, context }) => {
    const secret = new TextEncoder().encode("dev-only-secret-change-me-please-1234567890");
    const token = await new SignJWT({ sessionId: "does-not-exist-in-db" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000))
      .sign(secret);

    await context.addCookies([
      {
        name: "forkcast_session",
        value: token,
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto("/");
    await page.getByRole("link", { name: "Get started" }).click();

    await expect(page).toHaveURL(/\/signup/);
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  });
});

test("signup creates an account and redirects to onboarding", async ({ page }) => {
  const email = `e2e-${Date.now()}@forkcast.app`;

  await page.goto("/signup");
  await page.getByLabel("Name").fill("E2E Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret123");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/onboarding/);
});

test("login with valid credentials reaches /today", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@forkcast.app");
  await page.getByLabel("Password").fill("demo1234");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/today/);
  await expect(page.getByRole("heading", { name: "Demo" })).toBeVisible();
});

test("login with invalid credentials shows an error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@forkcast.app");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByText("Invalid email or password")).toBeVisible();
});

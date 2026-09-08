import { test, expect } from "@playwright/test";

// Verifies the light-first cream + lime recolor (globals.css / layout.tsx):
// light is now the default theme, and the toggle in /profile still switches
// to the dark palette correctly.

test("defaults to the light theme with the cream background", async ({ page }) => {
  await page.goto("/today");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(244, 243, 238)");
});

test("an accent-ink element renders the readable olive, not the raw lime fill", async ({ page }) => {
  // Signed-in sessions get redirected off "/" and "/login", so use a fresh,
  // unauthenticated context to reach the accent-ink link on the login page.
  await page.context().clearCookies();
  await page.goto("/login");

  const createAccount = page.getByRole("link", { name: "Create an account" });
  await expect(createAccount).toHaveCSS("color", "rgb(68, 109, 12)");
});

test("toggling to dark in /profile applies the dark palette", async ({ page }) => {
  await page.goto("/profile");

  await page.getByRole("button", { name: "Dark" }).click();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(10, 12, 10)");

  // Switch back so later tests in the shared worker see the light default.
  await page.getByRole("button", { name: "Light" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

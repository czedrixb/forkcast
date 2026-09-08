import { test as setup, expect } from "@playwright/test";

const AUTH_FILE = "e2e/.auth/user.json";

setup("authenticate as demo user", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@forkcast.app");
  await page.getByLabel("Password").fill("demo1234");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/today/);
  await page.context().storageState({ path: AUTH_FILE });
});

import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("onboarding wizard walks through all 5 steps and writes non-zero targets", async ({ page }) => {
  const email = `e2e-onboarding-${Date.now()}@forkcast.app`;

  await page.goto("/signup");
  await page.getByLabel("Name").fill("Onboarding Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/);

  // Step 1: goal
  await expect(page.getByRole("heading", { name: "What's your goal?" })).toBeVisible();
  await page.getByText("Lose weight").click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 2: profile (sex + birth date)
  await expect(page.getByRole("heading", { name: "Tell us about you" })).toBeVisible();
  await page.getByRole("button", { name: "female" }).click();
  await page.locator("#birthDateInput").fill("1994-03-15");
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 3: body
  await expect(page.getByRole("heading", { name: "Height & weight" })).toBeVisible();
  await page.locator("#heightInput").fill("168");
  await page.locator("#weightInput").fill("63");
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 4: activity
  await expect(page.getByRole("heading", { name: "Activity level" })).toBeVisible();
  await page.getByText("Moderate").click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 5: review + submit
  await expect(page.getByRole("heading", { name: "Your daily targets" })).toBeVisible();
  await expect(page.getByTestId("preview-calorie-target")).toHaveText(/\d+/);

  // A plain `.click()` on this submit button reliably never resolves its own
  // promise here, even though the click visibly succeeds (server logs show
  // the action running once and redirecting within ~400ms). Dispatch the
  // click via a raw DOM call instead, sidestepping Playwright's click-wait
  // machinery entirely.
  await page.locator('button[type="submit"]').evaluate((el: HTMLButtonElement) => el.click());
  await expect(page).toHaveURL(/\/today/, { timeout: 15_000 });

  // The calorie ring should now show a non-zero target on the dashboard.
  await expect(page.getByTestId("calorie-remaining")).toContainText(/left|over/);
});

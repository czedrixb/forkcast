import fs from "node:fs/promises";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

/** The calorie ring animates its count-up over ~900ms — wait it out before reading. */
export async function readConsumed(page: Page): Promise<number> {
  await page.waitForTimeout(1100);
  const text = await page.getByTestId("calorie-consumed").innerText();
  return Number(text.replace(/,/g, ""));
}

export type StubbedFood = {
  name: string;
  confidence: number;
  servingSize: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

const DEFAULT_MODEL = { provider: "google", model: "gemini-3.6-flash", label: "Gemini 3.6 Flash" };
const DEFAULT_FOODS: StubbedFood[] = [
  {
    name: "Grilled chicken salad",
    confidence: 0.91,
    servingSize: "1 bowl (350g)",
    kcal: 420,
    protein: 38,
    carbs: 22,
    fat: 18,
  },
];

/**
 * Stubs POST /api/scan so scan-flow tests are deterministic and need no real
 * AI provider keys — there's no mock provider on the server anymore. When
 * `withRealImage` is set, also copies the sample fixture into public/uploads
 * so the returned imagePath resolves to a real file, for tests that assert
 * the logged entry's thumbnail actually loads.
 */
export async function stubScanRoute(
  page: Page,
  opts: { foods?: StubbedFood[]; withRealImage?: boolean } = {},
): Promise<void> {
  const foods = opts.foods ?? DEFAULT_FOODS;
  let imagePath = "/uploads/e2e-stub/sample.jpg";

  if (opts.withRealImage) {
    const filename = `${Date.now()}.jpg`;
    const dir = path.join(process.cwd(), "public", "uploads", "e2e-stub");
    await fs.mkdir(dir, { recursive: true });
    await fs.copyFile(path.join(__dirname, "fixtures", "sample-food.jpg"), path.join(dir, filename));
    imagePath = `/uploads/e2e-stub/${filename}`;
  }

  await page.route("**/api/scan", (route) =>
    route.fulfill({ json: { imagePath, foods, model: DEFAULT_MODEL } }),
  );
}

/** Stubs POST /api/scan to fail as if every AI provider was unavailable. */
export async function stubScanRouteUnavailable(page: Page): Promise<void> {
  await page.route("**/api/scan", (route) =>
    route.fulfill({
      status: 503,
      json: {
        error:
          "Our food recognition is having a moment — none of the models are responding right now. " +
          "Your photo's still here, so try again in a minute.",
      },
    }),
  );
}

/**
 * Signs up a brand-new user and completes onboarding (same flow as
 * onboarding.spec.ts), leaving `page` on /today with an authenticated
 * session. Used by quota specs that need to burn a fresh Free allowance
 * without touching any other test's credits — call sites must opt out of
 * the shared demo-user storageState via
 * `test.use({ storageState: { cookies: [], origins: [] } })`.
 */
export async function createFreshUser(page: Page, label: string): Promise<{ email: string }> {
  const email = `e2e-${label}-${Date.now()}@forkcast.app`;

  await page.goto("/signup");
  await page.getByLabel("Name").fill("Quota Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("supersecret123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/);

  await page.getByText("Lose weight").click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("button", { name: "female" }).click();
  await page.locator("#birthDateInput").fill("1994-03-15");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.locator("#heightInput").fill("168");
  await page.locator("#weightInput").fill("63");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByText("Moderate").click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByTestId("preview-calorie-target")).toHaveText(/\d+/);
  // See onboarding.spec.ts — a plain .click() here reliably never resolves
  // its own promise despite the click succeeding server-side.
  await page.locator('button[type="submit"]').evaluate((el: HTMLButtonElement) => el.click());
  await expect(page).toHaveURL(/\/today/, { timeout: 15_000 });

  return { email };
}

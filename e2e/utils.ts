import fs from "node:fs/promises";
import path from "node:path";
import type { Page } from "@playwright/test";

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

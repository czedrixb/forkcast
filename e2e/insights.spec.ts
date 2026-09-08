import { test, expect } from "@playwright/test";

test("insights charts render for the seeded history", async ({ page }) => {
  await page.goto("/insights");

  await expect(page.getByText("Calories (14 days)")).toBeVisible();
  await expect(page.getByText("Macro split")).toBeVisible();
  await expect(page.getByText("Weight trend")).toBeVisible();
  await expect(page.getByText("Logging streak")).toBeVisible();

  // Recharts renders an SVG per chart — the seeded weight/calorie history
  // should produce at least 3 chart SVGs (calories, macro donut, weight).
  const svgCount = await page.locator("main svg").count();
  expect(svgCount).toBeGreaterThanOrEqual(3);
});

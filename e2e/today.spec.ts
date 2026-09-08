import { test, expect } from "@playwright/test";
import { readConsumed } from "./utils";

test("dashboard shows the seeded total for today", async ({ page }) => {
  await page.goto("/today");
  const consumed = await readConsumed(page);
  expect(consumed).toBeGreaterThan(0);
});

test("logging a food increases consumed kcal, deleting reverses it", async ({ page }) => {
  await page.goto("/today");
  const before = await readConsumed(page);

  await page.goto("/search?meal=snack");
  await page.getByPlaceholder("Search foods…").fill("Banana");
  await page.getByText("Banana", { exact: true }).first().click();

  await expect(page).toHaveURL(/\/today/);
  const afterAdd = await readConsumed(page);
  expect(afterAdd).toBeGreaterThan(before);

  // Delete the entry we just added (it's the newest snack entry).
  const snackSection = page.locator("section", { hasText: "Snacks" });
  await snackSection.getByLabel("Delete entry").last().click();
  await page.waitForTimeout(500);

  const afterDelete = await readConsumed(page);
  expect(afterDelete).toBeLessThan(afterAdd);
});

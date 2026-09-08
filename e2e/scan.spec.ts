import path from "node:path";
import { test, expect } from "@playwright/test";
import { readConsumed } from "./utils";

test("scanning a photo detects foods and logs them", async ({ page }) => {
  test.setTimeout(90_000); // real vision providers (plus first-hit dev-server compile) can take noticeably longer than the mock.
  await page.goto("/today");
  const before = await readConsumed(page);

  await page.goto("/scan");
  await page.locator("#scan-file-input").setInputFiles(path.join(__dirname, "fixtures", "sample-food.jpg"));

  // Preview stage: captured image + Analyze button.
  await expect(page.getByRole("button", { name: "Analyze" })).toBeVisible();
  await page.getByRole("button", { name: "Analyze" }).click();

  await expect(page.getByRole("button", { name: /Log \d+ item/ })).toBeVisible({ timeout: 60_000 });

  await page.getByRole("button", { name: /Log \d+ item/ }).click();
  await expect(page).toHaveURL(/\/today/);

  const after = await readConsumed(page);
  expect(after).toBeGreaterThan(before);
});

test("taking a photo requests the camera and captures a frame", async ({ page }) => {
  await page.goto("/scan");

  await page.getByRole("button", { name: "Take a photo" }).click();

  // Camera permission is pre-granted in the test context (see playwright.config.ts),
  // so getUserMedia resolves straight to the fake device stream — no prompt.
  await expect(page.getByRole("button", { name: "Capture" })).toBeVisible();
  await page.getByRole("button", { name: "Capture" }).click();

  await expect(page.getByRole("button", { name: "Analyze" })).toBeVisible();
});

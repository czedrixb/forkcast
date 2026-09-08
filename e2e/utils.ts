import type { Page } from "@playwright/test";

/** The calorie ring animates its count-up over ~900ms — wait it out before reading. */
export async function readConsumed(page: Page): Promise<number> {
  await page.waitForTimeout(1100);
  const text = await page.getByTestId("calorie-consumed").innerText();
  return Number(text.replace(/,/g, ""));
}

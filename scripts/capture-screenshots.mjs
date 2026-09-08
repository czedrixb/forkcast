import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs/promises";

const BASE = "http://localhost:3200";
const OUT = path.resolve(
  "D:/Submit/Obsidian Vault/Reports/attachments/2026-09-08-forkcast-initial-build",
);

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 390, height: 844 };

async function login(page) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill("demo@forkcast.app");
  await page.getByLabel("Password").fill("demo1234");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/today/);
  await page.waitForTimeout(1200); // let the calorie ring count-up settle
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();

  // Landing page (logged out) — desktop
  {
    const context = await browser.newContext({ viewport: DESKTOP });
    const page = await context.newPage();
    await page.goto(`${BASE}/`);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, "landing-desktop.png") });
    await context.close();
  }

  // Today — desktop + mobile
  for (const [name, viewport] of [["desktop", DESKTOP], ["mobile", MOBILE]]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await login(page);
    await page.screenshot({ path: path.join(OUT, `today-${name}.png`) });
    await context.close();
  }

  // Onboarding wizard — first step (fresh signup) — mobile
  {
    const context = await browser.newContext({ viewport: MOBILE });
    const page = await context.newPage();
    const email = `screenshot-${Date.now()}@forkcast.app`;
    await page.goto(`${BASE}/signup`);
    await page.getByLabel("Name").fill("Alex Rivera");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("supersecret123");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(/\/onboarding/);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, "onboarding-goal-mobile.png") });

    // Walk to the review step for a second shot.
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
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, "onboarding-review-mobile.png") });
    await context.close();
  }

  // Scan flow — preview + results — mobile
  {
    const context = await browser.newContext({ viewport: MOBILE });
    const page = await context.newPage();
    await login(page);
    // Stub the scan response (no mock provider anymore, and we don't want
    // this script to depend on a real API key) with an artificial delay so
    // the scanning-overlay state is actually catchable in a screenshot.
    await page.route("**/api/scan", async (route) => {
      await new Promise((r) => setTimeout(r, 1200));
      await route.fulfill({
        json: {
          imagePath: "/uploads/demo/sample-food.jpg",
          model: { provider: "google", model: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
          foods: [
            {
              name: "Grilled chicken salad",
              confidence: 0.91,
              servingSize: "1 bowl (350g)",
              kcal: 420,
              protein: 38,
              carbs: 22,
              fat: 18,
            },
          ],
        },
      });
    });
    await page.goto(`${BASE}/scan`);
    await page
      .locator("#scan-file-input")
      .setInputFiles(path.resolve("e2e/fixtures/sample-food.jpg"));
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, "scan-preview-mobile.png") });

    await page.getByRole("button", { name: "Analyze" }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, "scan-analyzing-mobile.png") });

    await page.waitForSelector('button:has-text("Log ")', { timeout: 15_000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, "scan-results-mobile.png") });
    await context.close();
  }

  // Insights — desktop + mobile
  for (const [name, viewport] of [["desktop", DESKTOP], ["mobile", MOBILE]]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await login(page);
    await page.goto(`${BASE}/insights`);
    await page.waitForTimeout(1800); // let all four charts finish their mount animations
    await page.screenshot({ path: path.join(OUT, `insights-${name}.png`), fullPage: true });
    await context.close();
  }

  await browser.close();
  console.log("Screenshots written to", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

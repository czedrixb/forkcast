import "server-only";

import { db } from "@/lib/db";
import type { AnalyzeImageFn, DetectedFood } from "@/lib/ai/types";

/** Small, dependency-free string hash (djb2) — deterministic, not cryptographic. */
function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

/**
 * Deterministic stand-in for the real vision call: hashes the image bytes to
 * pick 1-3 foods from the seeded database with plausible portions and
 * confidences. Used whenever ANTHROPIC_API_KEY is unset so the app (and the
 * Playwright suite) run with zero keys and zero cost.
 */
export const analyzeFoodImageWithMock: AnalyzeImageFn = async ({ base64 }) => {
  const foods = await db.food.findMany({ where: { isCustom: false }, take: 200 });
  if (foods.length === 0) {
    throw new Error("No seeded foods available for the mock scan provider — run `npx prisma db seed`");
  }

  const seed = hashString(base64.slice(0, 512) || "forkcast");
  const count = 1 + (seed % 3); // 1-3 items

  const results: DetectedFood[] = [];
  for (let i = 0; i < count; i++) {
    const index = (seed + i * 97) % foods.length;
    const food = foods[index];
    // Portion multiplier in [0.75, 1.5], deterministic per item.
    const portionSeed = (seed >> (i * 4)) % 76;
    const portionMultiplier = 0.75 + portionSeed / 100;
    const confidence = 0.72 + ((seed >> (i * 3)) % 23) / 100; // 0.72-0.94

    results.push({
      name: food.name,
      confidence: Math.min(0.97, confidence),
      servingSize: `${Math.round(food.servingSize * portionMultiplier)} ${food.servingUnit}`,
      kcal: Math.round(food.kcal * portionMultiplier),
      protein: Math.round(food.protein * portionMultiplier * 10) / 10,
      carbs: Math.round(food.carbs * portionMultiplier * 10) / 10,
      fat: Math.round(food.fat * portionMultiplier * 10) / 10,
      fiber: food.fiber != null ? Math.round(food.fiber * portionMultiplier * 10) / 10 : undefined,
      sugar: food.sugar != null ? Math.round(food.sugar * portionMultiplier * 10) / 10 : undefined,
      sodium: food.sodium != null ? Math.round(food.sodium * portionMultiplier) : undefined,
    });
  }

  return results;
};

import "server-only";

import type { AnalysisModel, AnalyzeImageFn, DetectedFood } from "@/lib/ai/types";

const MODEL_ID = "mock-vision";

export const MOCK_MODEL: AnalysisModel = {
  provider: "mock",
  model: MODEL_ID,
  label: "Sample estimate (demo)",
};

const SAMPLE_FOODS: DetectedFood[] = [
  {
    name: "Grilled chicken salad",
    confidence: 0.92,
    servingSize: "1 bowl (350g)",
    kcal: 420,
    protein: 38,
    carbs: 22,
    fat: 18,
    fiber: 5,
    sugar: 4,
    sodium: 480,
  },
];

/**
 * Test-only failure hook: a real photo re-encoded by src/lib/image.ts never
 * contains this marker, but Playwright can post a fixture that appends it
 * past the JPEG's end-of-image bytes, letting e2e exercise the
 * reservation-release path deterministically without a flaky real provider.
 */
const FORCE_FAILURE_MARKER = "FORKCAST_MOCK_FAIL";

/**
 * Deterministic sample estimates -- never calls a real AI provider. Selected
 * only when AI_PROVIDER=mock (see src/lib/ai/analyze.ts); never chosen by key
 * presence, so a public/portfolio deployment can't accidentally fall back to
 * a paid provider, and a paid provider's key presence can't accidentally
 * select this either. Results are labeled "Sample estimate (demo)" so they
 * are never mistaken for a real analysis.
 */
export const analyzeFoodImageWithMock: AnalyzeImageFn = async ({ base64 }) => {
  if (Buffer.from(base64, "base64").includes(FORCE_FAILURE_MARKER)) {
    throw new Error("Mock provider forced failure (test hook)");
  }
  return SAMPLE_FOODS;
};

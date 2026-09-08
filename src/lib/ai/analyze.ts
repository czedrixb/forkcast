import "server-only";

import type { AnalyzeImageInput, DetectedFood } from "@/lib/ai/types";

export type { DetectedFood, AnalyzeImageInput } from "@/lib/ai/types";

/**
 * Single entry point for the scan feature. Prefers the Anthropic vision
 * provider when ANTHROPIC_API_KEY is set, falls back to OpenAI when only
 * OPENAI_API_KEY is set, and otherwise falls back to a deterministic mock —
 * so the app and E2E suite run with zero keys/cost.
 */
export async function analyzeFoodImage(input: AnalyzeImageInput): Promise<DetectedFood[]> {
  if (process.env.ANTHROPIC_API_KEY) {
    const { analyzeFoodImageWithAnthropic } = await import("@/lib/ai/providers/anthropic");
    return analyzeFoodImageWithAnthropic(input);
  }

  if (process.env.OPENAI_API_KEY) {
    const { analyzeFoodImageWithOpenAI } = await import("@/lib/ai/providers/openai");
    return analyzeFoodImageWithOpenAI(input);
  }

  const { analyzeFoodImageWithMock } = await import("@/lib/ai/providers/mock");
  return analyzeFoodImageWithMock(input);
}

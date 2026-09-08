import "server-only";

import type { AnalysisModel, AnalysisResult, AnalyzeImageFn, AnalyzeImageInput } from "@/lib/ai/types";

export type { DetectedFood, AnalyzeImageInput, AnalysisModel, AnalysisResult } from "@/lib/ai/types";

/** Shown to the user when every configured provider is unavailable. */
export const NO_PROVIDERS_MESSAGE =
  "Our food recognition is having a moment — none of the models are responding right now. " +
  "Your photo's still here, so try again in a minute.";

/** Thrown when no provider has a usable key, or every configured one failed. */
export class NoProvidersAvailableError extends Error {
  constructor() {
    super(NO_PROVIDERS_MESSAGE);
    this.name = "NoProvidersAvailableError";
  }
}

type ProviderEntry = {
  envKey: string;
  load: () => Promise<{ fn: AnalyzeImageFn; model: AnalysisModel }>;
};

// Tried in order. A provider with no key configured is skipped without an
// attempt; a provider that throws (bad key, rate limit, network, unparseable
// output) is logged and the cascade falls through to the next one. Gemini's
// free AI Studio tier is the last resort, so a zero-cost key keeps the scan
// feature alive even when the paid providers are exhausted.
const PROVIDERS: ProviderEntry[] = [
  {
    envKey: "ANTHROPIC_API_KEY",
    load: async () => {
      const { analyzeFoodImageWithAnthropic, ANTHROPIC_MODEL } = await import("@/lib/ai/providers/anthropic");
      return { fn: analyzeFoodImageWithAnthropic, model: ANTHROPIC_MODEL };
    },
  },
  {
    envKey: "OPENAI_API_KEY",
    load: async () => {
      const { analyzeFoodImageWithOpenAI, OPENAI_MODEL } = await import("@/lib/ai/providers/openai");
      return { fn: analyzeFoodImageWithOpenAI, model: OPENAI_MODEL };
    },
  },
  {
    envKey: "GEMINI_API_KEY",
    load: async () => {
      const { analyzeFoodImageWithGemini, GEMINI_MODEL } = await import("@/lib/ai/providers/gemini");
      return { fn: analyzeFoodImageWithGemini, model: GEMINI_MODEL };
    },
  },
];

/**
 * Single entry point for the scan feature. Tries each configured provider in
 * order (Anthropic → OpenAI → Gemini), falling through to the next one on
 * any failure. Throws NoProvidersAvailableError when none has a usable key
 * or every configured one failed — the caller should surface that message
 * as-is rather than inventing a result.
 */
export async function analyzeFoodImage(input: AnalyzeImageInput): Promise<AnalysisResult> {
  let attempted = false;

  for (const { envKey, load } of PROVIDERS) {
    if (!process.env[envKey]) continue;
    attempted = true;

    try {
      const { fn, model } = await load();
      const foods = await fn(input);
      return { foods, model };
    } catch (error) {
      console.error(`[scan] ${envKey} provider failed`, error);
    }
  }

  if (!attempted) {
    console.error("[scan] no vision provider API keys are configured");
  }
  throw new NoProvidersAvailableError();
}

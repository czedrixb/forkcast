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
  name: string;
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
    name: "anthropic",
    envKey: "ANTHROPIC_API_KEY",
    load: async () => {
      const { analyzeFoodImageWithAnthropic, ANTHROPIC_MODEL } = await import("@/lib/ai/providers/anthropic");
      return { fn: analyzeFoodImageWithAnthropic, model: ANTHROPIC_MODEL };
    },
  },
  {
    name: "openai",
    envKey: "OPENAI_API_KEY",
    load: async () => {
      const { analyzeFoodImageWithOpenAI, OPENAI_MODEL } = await import("@/lib/ai/providers/openai");
      return { fn: analyzeFoodImageWithOpenAI, model: OPENAI_MODEL };
    },
  },
  {
    name: "gemini",
    envKey: "GEMINI_API_KEY",
    load: async () => {
      const { analyzeFoodImageWithGemini, GEMINI_MODEL } = await import("@/lib/ai/providers/gemini");
      return { fn: analyzeFoodImageWithGemini, model: GEMINI_MODEL };
    },
  },
];

async function analyzeWithMock(input: AnalyzeImageInput): Promise<AnalysisResult> {
  const { analyzeFoodImageWithMock, MOCK_MODEL } = await import("@/lib/ai/providers/mock");
  return { foods: await analyzeFoodImageWithMock(input), model: MOCK_MODEL };
}

/**
 * Set to "mock" to force the deterministic sample-estimate provider (see
 * providers/mock.ts) regardless of which real provider keys are configured
 * — used for the public portfolio deployment and Playwright e2e, so a demo
 * environment can never incur real AI spend.
 *
 * Set to a specific provider name ("anthropic" | "openai" | "gemini") to pin
 * the cascade to just that one, with the mock provider as its last-resort
 * fallback if it fails (bad key, rate limit, network, unparseable output) —
 * this keeps local dev usable without a working real key while still
 * exercising the real provider first.
 *
 * Left unset, behavior is unchanged: the key-presence cascade below (no
 * mock fallback there — that cascade is only reachable when a real key is
 * configured, so a misconfigured deployment fails loudly instead of
 * silently serving real-looking mock data).
 */
async function analyzeWithExplicitProvider(input: AnalyzeImageInput, selected: string): Promise<AnalysisResult> {
  if (selected === "mock") {
    try {
      return await analyzeWithMock(input);
    } catch (error) {
      console.error(`[scan] AI_PROVIDER="mock" failed`, error);
      throw new NoProvidersAvailableError();
    }
  }

  const entry = PROVIDERS.find((p) => p.name === selected);
  if (!entry) {
    throw new Error(`AI_PROVIDER="${selected}" is not a recognized provider (expected mock/anthropic/openai/gemini)`);
  }

  try {
    const { fn, model } = await entry.load();
    return { foods: await fn(input), model };
  } catch (error) {
    console.error(`[scan] AI_PROVIDER="${selected}" failed, falling back to mock`, error);
    try {
      return await analyzeWithMock(input);
    } catch (mockError) {
      console.error("[scan] mock fallback also failed", mockError);
      throw new NoProvidersAvailableError();
    }
  }
}

/**
 * Single entry point for the scan feature. When AI_PROVIDER is set to a real
 * provider name, uses exactly that provider, falling back to the mock
 * provider as a last resort if it fails. When set to "mock", uses the mock
 * provider directly. Otherwise tries each configured provider in order
 * (Anthropic → OpenAI → Gemini), falling through to the next one on any
 * failure. Throws NoProvidersAvailableError when none has a usable key or
 * every configured one failed — the caller should surface that message
 * as-is rather than inventing a result.
 */
export async function analyzeFoodImage(input: AnalyzeImageInput): Promise<AnalysisResult> {
  const selected = process.env.AI_PROVIDER;
  if (selected) {
    return analyzeWithExplicitProvider(input, selected);
  }

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

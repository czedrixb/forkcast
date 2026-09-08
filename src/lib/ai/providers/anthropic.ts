import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { AnalysisModel, AnalyzeImageFn } from "@/lib/ai/types";
import { DetectedFoodsResponseSchema } from "@/lib/ai/types";
import { SYSTEM_PROMPT, USER_PROMPT } from "@/lib/ai/prompt";

const MODEL_ID = "claude-opus-5";

export const ANTHROPIC_MODEL: AnalysisModel = {
  provider: "anthropic",
  model: MODEL_ID,
  label: "Claude Opus 5",
};

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export const analyzeFoodImageWithAnthropic: AnalyzeImageFn = async ({ base64, mimeType }) => {
  const response = await getClient().messages.parse({
    model: MODEL_ID,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
              data: base64,
            },
          },
          { type: "text", text: USER_PROMPT },
        ],
      },
    ],
    output_config: {
      format: zodOutputFormat(DetectedFoodsResponseSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("Model response could not be parsed into the expected shape");
  }

  return response.parsed_output.foods;
};

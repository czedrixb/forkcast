import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { AnalyzeImageFn } from "@/lib/ai/types";
import { DetectedFoodsResponseSchema } from "@/lib/ai/types";

const SYSTEM_PROMPT = `You are a professional nutritionist and food recognition expert.
Identify every distinct food item visible in the photo (up to 5). For each item, estimate:
- a short, natural food name
- your confidence (0-1); use a lower confidence when the food or portion is ambiguous
- a plausible serving size description (e.g. "1 medium bowl", "150g")
- calories (kcal) and macronutrients (protein, carbs, fat in grams) for that serving
- optionally fiber, sugar, and sodium in grams/mg if you can estimate them reasonably

Base your estimates on typical USDA-style nutrition data for the food and portion you see.
Return only foods that are actually visible in the image.`;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export const analyzeFoodImageWithAnthropic: AnalyzeImageFn = async ({ base64, mimeType }) => {
  const response = await getClient().messages.parse({
    model: "claude-opus-5",
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
          { type: "text", text: "Identify the food(s) in this photo and estimate their nutrition." },
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

import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
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

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) client = new OpenAI();
  return client;
}

export const analyzeFoodImageWithOpenAI: AnalyzeImageFn = async ({ base64, mimeType }) => {
  const response = await getClient().responses.parse({
    model: "gpt-5.5",
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "input_image", detail: "auto", image_url: `data:${mimeType};base64,${base64}` },
          { type: "input_text", text: "Identify the food(s) in this photo and estimate their nutrition." },
        ],
      },
    ],
    text: { format: zodTextFormat(DetectedFoodsResponseSchema, "detected_foods") },
  });

  if (!response.output_parsed) {
    throw new Error("Model response could not be parsed into the expected shape");
  }

  return response.output_parsed.foods;
};

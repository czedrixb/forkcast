import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { AnalysisModel, AnalyzeImageFn } from "@/lib/ai/types";
import { DetectedFoodsResponseSchema } from "@/lib/ai/types";
import { SYSTEM_PROMPT, USER_PROMPT } from "@/lib/ai/prompt";

const MODEL_ID = "gpt-5.5";

export const OPENAI_MODEL: AnalysisModel = {
  provider: "openai",
  model: MODEL_ID,
  label: "GPT-5.5",
};

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) client = new OpenAI();
  return client;
}

export const analyzeFoodImageWithOpenAI: AnalyzeImageFn = async ({ base64, mimeType }) => {
  const response = await getClient().responses.parse({
    model: MODEL_ID,
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "input_image", detail: "auto", image_url: `data:${mimeType};base64,${base64}` },
          { type: "input_text", text: USER_PROMPT },
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

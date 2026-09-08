import "server-only";

import { GoogleGenAI } from "@google/genai";
import type { AnalysisModel, AnalyzeImageFn } from "@/lib/ai/types";
import { DetectedFoodsResponseSchema } from "@/lib/ai/types";
import { SYSTEM_PROMPT, USER_PROMPT } from "@/lib/ai/prompt";

const MODEL_ID = "gemini-3.6-flash";

export const GEMINI_MODEL: AnalysisModel = {
  provider: "google",
  model: MODEL_ID,
  label: "Gemini 3.6 Flash",
};

// Gemini's responseJsonSchema only understands a subset of JSON Schema (no
// $schema, no minLength/minimum-as-exclusive, etc. — see the SDK's
// GenerationConfig.responseJsonSchema doc comment for the exact allow-list).
// Hand-written rather than derived from z.toJSONSchema() so it stays inside
// that subset; the strict DetectedFoodsResponseSchema below is still what
// actually validates the parsed response.
const GEMINI_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    foods: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          servingSize: { type: "string" },
          kcal: { type: "number", minimum: 0 },
          protein: { type: "number", minimum: 0 },
          carbs: { type: "number", minimum: 0 },
          fat: { type: "number", minimum: 0 },
          fiber: { anyOf: [{ type: "number", minimum: 0 }, { type: "null" }] },
          sugar: { anyOf: [{ type: "number", minimum: 0 }, { type: "null" }] },
          sodium: { anyOf: [{ type: "number", minimum: 0 }, { type: "null" }] },
        },
        required: ["name", "confidence", "servingSize", "kcal", "protein", "carbs", "fat"],
      },
    },
  },
  required: ["foods"],
};

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export const analyzeFoodImageWithGemini: AnalyzeImageFn = async ({ base64, mimeType }) => {
  const response = await getClient().models.generateContent({
    model: MODEL_ID,
    contents: [
      {
        role: "user",
        parts: [{ inlineData: { mimeType, data: base64 } }, { text: USER_PROMPT }],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseJsonSchema: GEMINI_RESPONSE_SCHEMA,
    },
  });

  if (!response.text) {
    throw new Error("Model response contained no text output");
  }

  return DetectedFoodsResponseSchema.parse(JSON.parse(response.text)).foods;
};

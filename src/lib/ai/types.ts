import { z } from "zod";

export const DetectedFoodSchema = z.object({
  name: z.string().min(1),
  confidence: z.number().min(0).max(1),
  servingSize: z.string().min(1),
  kcal: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  fiber: z.number().nonnegative().nullable().optional(),
  sugar: z.number().nonnegative().nullable().optional(),
  sodium: z.number().nonnegative().nullable().optional(),
});

export type DetectedFood = z.infer<typeof DetectedFoodSchema>;

// Wrapped in an object (rather than a bare array) because structured-output
// schemas are most reliably enforced as a single top-level JSON object.
export const DetectedFoodsResponseSchema = z.object({
  foods: z.array(DetectedFoodSchema).min(1).max(5),
});

export type AnalyzeImageInput = {
  base64: string;
  mimeType: string;
};

export type AnalyzeImageFn = (input: AnalyzeImageInput) => Promise<DetectedFood[]>;

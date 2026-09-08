import { z } from "zod";

export const SignupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const LoginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const OnboardingSchema = z.object({
  sex: z.enum(["male", "female"]),
  birthDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date"),
  heightCm: z.coerce.number().min(80).max(250),
  weightKg: z.coerce.number().min(30).max(300),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "athlete"]),
  goal: z.enum(["lose", "maintain", "gain"]),
});

export const LogEntrySchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1),
  kcal: z.coerce.number().nonnegative(),
  protein: z.coerce.number().nonnegative(),
  carbs: z.coerce.number().nonnegative(),
  fat: z.coerce.number().nonnegative(),
  foodId: z.string().optional(),
  source: z.enum(["manual", "search", "scan"]).default("manual"),
});

export const CustomFoodSchema = z.object({
  name: z.string().trim().min(1),
  servingSize: z.coerce.number().positive(),
  servingUnit: z.string().trim().min(1),
  kcal: z.coerce.number().nonnegative(),
  protein: z.coerce.number().nonnegative(),
  carbs: z.coerce.number().nonnegative(),
  fat: z.coerce.number().nonnegative(),
});

export const WeightEntrySchema = z.object({
  weightKg: z.coerce.number().min(20).max(400),
});

export const WaterEntrySchema = z.object({
  ml: z.coerce.number().int().positive().max(5000),
});

"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { CustomFoodSchema, LogEntrySchema } from "@/lib/validation";
import type { DetectedFood } from "@/lib/ai/types";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export type LogEntryInput = {
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  quantity: number;
  unit: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  foodId?: string;
  source?: "manual" | "search" | "scan";
  imagePath?: string;
};

export async function logFood(input: LogEntryInput) {
  const user = await requireUser();
  const validated = LogEntrySchema.parse(input);

  await db.logEntry.create({
    data: {
      userId: user.id,
      foodId: validated.foodId,
      mealType: validated.mealType,
      quantity: validated.quantity,
      unit: validated.unit,
      kcal: validated.kcal,
      protein: validated.protein,
      carbs: validated.carbs,
      fat: validated.fat,
      source: validated.source,
      imagePath: input.imagePath,
    },
  });
}

export async function logDetectedFoods(
  items: DetectedFood[],
  mealType: "breakfast" | "lunch" | "dinner" | "snack",
  imagePath?: string,
) {
  const user = await requireUser();

  await db.logEntry.createMany({
    data: items.map((item) => ({
      userId: user.id,
      mealType,
      quantity: 1,
      unit: item.servingSize,
      kcal: item.kcal,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      source: "scan" as const,
      imagePath,
    })),
  });
}

export async function deleteLogEntry(id: string) {
  const user = await requireUser();
  await db.logEntry.deleteMany({ where: { id, userId: user.id } });
}

export async function createCustomFood(input: {
  name: string;
  servingSize: number;
  servingUnit: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}) {
  const user = await requireUser();
  const validated = CustomFoodSchema.parse(input);

  return db.food.create({
    data: { ...validated, isCustom: true, userId: user.id },
  });
}

export async function searchFoods(query: string) {
  await requireUser();
  if (!query.trim()) return [];

  return db.food.findMany({
    where: { name: { contains: query } },
    orderBy: { name: "asc" },
    take: 20,
  });
}

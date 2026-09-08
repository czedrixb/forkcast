"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { WaterEntrySchema, WeightEntrySchema } from "@/lib/validation";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function addWater(ml: number) {
  const user = await requireUser();
  const validated = WaterEntrySchema.parse({ ml });
  await db.waterEntry.create({ data: { userId: user.id, ml: validated.ml } });
}

export async function addWeight(weightKg: number) {
  const user = await requireUser();
  const validated = WeightEntrySchema.parse({ weightKg });
  await db.weightEntry.create({ data: { userId: user.id, weightKg: validated.weightKg } });
  await db.profile.update({ where: { userId: user.id }, data: { weightKg: validated.weightKg } });
}

export async function updateProfileTargets(input: {
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
}) {
  const user = await requireUser();
  await db.profile.update({ where: { userId: user.id }, data: input });
}

export async function updateTheme(theme: "dark" | "light") {
  const user = await requireUser();
  await db.profile.update({ where: { userId: user.id }, data: { theme } });
}

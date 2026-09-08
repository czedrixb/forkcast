import "server-only";

import { db } from "@/lib/db";

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function getDayData(userId: string, date: Date = new Date()) {
  const gte = startOfDay(date);
  const lte = endOfDay(date);

  const [entries, waterEntries] = await Promise.all([
    db.logEntry.findMany({
      where: { userId, loggedAt: { gte, lte } },
      include: { food: { select: { name: true } } },
      orderBy: { loggedAt: "asc" },
    }),
    db.waterEntry.findMany({ where: { userId, recordedAt: { gte, lte } } }),
  ]);

  const totals = entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const byMeal = {
    breakfast: entries.filter((e) => e.mealType === "breakfast"),
    lunch: entries.filter((e) => e.mealType === "lunch"),
    dinner: entries.filter((e) => e.mealType === "dinner"),
    snack: entries.filter((e) => e.mealType === "snack"),
  };

  const waterMl = waterEntries.reduce((sum, w) => sum + w.ml, 0);

  return { entries, byMeal, totals, waterMl };
}

/** Consecutive days (ending today) with at least one logged entry. */
export async function getStreak(userId: string): Promise<number> {
  const recent = await db.logEntry.findMany({
    where: { userId },
    select: { loggedAt: true },
    orderBy: { loggedAt: "desc" },
    take: 500,
  });

  const days = new Set(recent.map((e) => startOfDay(e.loggedAt).getTime()));

  let streak = 0;
  const cursor = startOfDay(new Date());
  while (days.has(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

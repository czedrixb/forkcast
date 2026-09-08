import "server-only";

import { db } from "@/lib/db";
import { startOfDay, endOfDay } from "@/lib/queries/today";

export type DailyCalorieDatum = { date: string; label: string; kcal: number; target: number };

export async function getCalorieHistory(userId: string, target: number, days = 14): Promise<DailyCalorieDatum[]> {
  const today = new Date();
  const from = startOfDay(new Date(today));
  from.setDate(from.getDate() - (days - 1));

  const entries = await db.logEntry.findMany({
    where: { userId, loggedAt: { gte: from, lte: endOfDay(today) } },
    select: { loggedAt: true, kcal: true },
  });

  const byDay = new Map<string, number>();
  for (const entry of entries) {
    const key = startOfDay(entry.loggedAt).toISOString();
    byDay.set(key, (byDay.get(key) ?? 0) + entry.kcal);
  }

  const result: DailyCalorieDatum[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(from);
    day.setDate(from.getDate() + i);
    const key = startOfDay(day).toISOString();
    result.push({
      date: key,
      label: day.toLocaleDateString(undefined, { weekday: "short" }),
      kcal: Math.round(byDay.get(key) ?? 0),
      target,
    });
  }
  return result;
}

export async function getMacroSplit(userId: string, days = 14) {
  const from = startOfDay(new Date());
  from.setDate(from.getDate() - (days - 1));

  const entries = await db.logEntry.findMany({
    where: { userId, loggedAt: { gte: from } },
    select: { protein: true, carbs: true, fat: true },
  });

  const totals = entries.reduce(
    (acc, e) => ({ protein: acc.protein + e.protein, carbs: acc.carbs + e.carbs, fat: acc.fat + e.fat }),
    { protein: 0, carbs: 0, fat: 0 },
  );

  return [
    { name: "Protein", value: Math.round(totals.protein), color: "var(--protein)" },
    { name: "Carbs", value: Math.round(totals.carbs), color: "var(--carbs)" },
    { name: "Fat", value: Math.round(totals.fat), color: "var(--fat)" },
  ];
}

export async function getWeightHistory(userId: string, days = 60) {
  const from = new Date();
  from.setDate(from.getDate() - days);

  const entries = await db.weightEntry.findMany({
    where: { userId, recordedAt: { gte: from } },
    orderBy: { recordedAt: "asc" },
  });

  return entries.map((e) => ({
    date: e.recordedAt.toISOString(),
    label: e.recordedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    weightKg: e.weightKg,
  }));
}

export async function getStreakCalendar(userId: string, days = 28) {
  const from = startOfDay(new Date());
  from.setDate(from.getDate() - (days - 1));

  const entries = await db.logEntry.findMany({
    where: { userId, loggedAt: { gte: from } },
    select: { loggedAt: true },
  });

  const loggedDays = new Set(entries.map((e) => startOfDay(e.loggedAt).toISOString()));

  const cells: { date: string; logged: boolean }[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(from);
    day.setDate(from.getDate() + i);
    const key = startOfDay(day).toISOString();
    cells.push({ date: key, logged: loggedDays.has(key) });
  }
  return cells;
}

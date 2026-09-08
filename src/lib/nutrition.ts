/**
 * Nutrition math shared by onboarding and the dashboard.
 * No framework or DB imports here — pure functions, easy to unit-reason-about.
 */

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "athlete";
export type Goal = "lose" | "maintain" | "gain";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

const GOAL_DELTA_KCAL: Record<Goal, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

export function calculateAge(birthDate: Date, on: Date = new Date()): number {
  let age = on.getFullYear() - birthDate.getFullYear();
  const monthDiff = on.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && on.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/** Mifflin-St Jeor basal metabolic rate, in kcal/day. */
export function calculateBMR(params: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
}): number {
  const { sex, weightKg, heightCm, age } = params;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

/** Total daily energy expenditure — BMR scaled by activity level. */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

export type Targets = {
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
};

/**
 * Full onboarding calculation: BMR -> TDEE -> goal-adjusted calories -> 30/40/30
 * protein/carb/fat macro split (grams), rounded to whole numbers.
 */
export function calculateTargets(params: {
  sex: Sex;
  birthDate: Date;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}): Targets {
  const age = calculateAge(params.birthDate);
  const bmr = calculateBMR({ sex: params.sex, weightKg: params.weightKg, heightCm: params.heightCm, age });
  const tdee = calculateTDEE(bmr, params.activityLevel);
  const calorieTarget = Math.max(1200, Math.round(tdee + GOAL_DELTA_KCAL[params.goal]));

  // Macro split: 30% protein, 40% carbs, 30% fat (of total calories).
  // Protein/carbs = 4 kcal/g, fat = 9 kcal/g.
  const proteinTarget = Math.round((calorieTarget * 0.3) / 4);
  const carbTarget = Math.round((calorieTarget * 0.4) / 4);
  const fatTarget = Math.round((calorieTarget * 0.3) / 9);

  return { calorieTarget, proteinTarget, carbTarget, fatTarget };
}

export type DailyTotals = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export function sumEntries(entries: { kcal: number; protein: number; carbs: number; fat: number }[]): DailyTotals {
  return entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function clampPercent(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (value / target) * 100));
}

"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { OnboardingSchema } from "@/lib/validation";
import { calculateTargets } from "@/lib/nutrition";

export type OnboardingFormState = {
  errors?: Record<string, string[]>;
  message?: string;
} | undefined;

export async function completeOnboarding(
  _prevState: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const validated = OnboardingSchema.safeParse({
    sex: formData.get("sex"),
    birthDate: formData.get("birthDate"),
    heightCm: formData.get("heightCm"),
    weightKg: formData.get("weightKg"),
    activityLevel: formData.get("activityLevel"),
    goal: formData.get("goal"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { sex, birthDate, heightCm, weightKg, activityLevel, goal } = validated.data;
  const targets = calculateTargets({
    sex,
    birthDate: new Date(birthDate),
    heightCm,
    weightKg,
    activityLevel,
    goal,
  });

  await db.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      sex,
      birthDate: new Date(birthDate),
      heightCm,
      weightKg,
      activityLevel,
      goal,
      ...targets,
    },
    update: {
      sex,
      birthDate: new Date(birthDate),
      heightCm,
      weightKg,
      activityLevel,
      goal,
      ...targets,
    },
  });

  await db.weightEntry.create({ data: { userId: user.id, weightKg } });

  redirect("/today");
}

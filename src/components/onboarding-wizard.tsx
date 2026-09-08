"use client";

import { useActionState, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { completeOnboarding } from "@/actions/onboarding";
import { calculateTargets, type ActivityLevel, type Goal, type Sex } from "@/lib/nutrition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const GOALS: { value: Goal; label: string; hint: string }[] = [
  { value: "lose", label: "Lose weight", hint: "~500 kcal/day deficit" },
  { value: "maintain", label: "Maintain", hint: "Stay at current weight" },
  { value: "gain", label: "Gain weight", hint: "~300 kcal/day surplus" },
];

const ACTIVITY: { value: ActivityLevel; label: string; hint: string }[] = [
  { value: "sedentary", label: "Sedentary", hint: "Little to no exercise" },
  { value: "light", label: "Light", hint: "1-3 workouts/week" },
  { value: "moderate", label: "Moderate", hint: "3-5 workouts/week" },
  { value: "active", label: "Active", hint: "6-7 workouts/week" },
  { value: "athlete", label: "Athlete", hint: "Twice a day" },
];

type WizardState = {
  goal: Goal;
  sex: Sex;
  birthDate: string;
  heightCm: string;
  weightKg: string;
  activityLevel: ActivityLevel;
};

const STEPS = ["goal", "profile", "body", "activity", "review"] as const;

function OptionCard({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
        active ? "border-accent-ink bg-accent/20" : "border-border bg-surface-2 hover:border-muted",
      )}
    >
      <p className="font-medium">{label}</p>
      <p className="text-sm text-muted">{hint}</p>
    </button>
  );
}

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [state, action, pending] = useActionState(completeOnboarding, undefined);
  const [wizard, setWizard] = useState<WizardState>({
    goal: "maintain",
    sex: "female",
    birthDate: "",
    heightCm: "",
    weightKg: "",
    activityLevel: "moderate",
  });

  const canAdvance = useMemo(() => {
    switch (STEPS[step]) {
      case "goal":
        return Boolean(wizard.goal);
      case "profile":
        return Boolean(wizard.sex && wizard.birthDate);
      case "body":
        return Boolean(wizard.heightCm && wizard.weightKg);
      case "activity":
        return Boolean(wizard.activityLevel);
      default:
        return true;
    }
  }, [step, wizard]);

  const preview = useMemo(() => {
    if (!wizard.birthDate || !wizard.heightCm || !wizard.weightKg) return null;
    try {
      return calculateTargets({
        sex: wizard.sex,
        birthDate: new Date(wizard.birthDate),
        heightCm: Number(wizard.heightCm),
        weightKg: Number(wizard.weightKg),
        activityLevel: wizard.activityLevel,
        goal: wizard.goal,
      });
    } catch {
      return null;
    }
  }, [wizard]);

  return (
    <form action={action} className="flex flex-1 flex-col">
      <input type="hidden" name="goal" value={wizard.goal} />
      <input type="hidden" name="sex" value={wizard.sex} />
      <input type="hidden" name="birthDate" value={wizard.birthDate} />
      <input type="hidden" name="heightCm" value={wizard.heightCm} />
      <input type="hidden" name="weightKg" value={wizard.weightKg} />
      <input type="hidden" name="activityLevel" value={wizard.activityLevel} />

      {/* progress dots */}
      <div className="mb-8 flex gap-1.5">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-accent" : "bg-surface-2")}
          />
        ))}
      </div>

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {STEPS[step] === "goal" && (
              <div>
                <h1 className="mb-1 font-display text-2xl font-bold">What&apos;s your goal?</h1>
                <p className="mb-6 text-muted">We&apos;ll set your daily calorie target from this.</p>
                <div className="flex flex-col gap-3">
                  {GOALS.map((g) => (
                    <OptionCard
                      key={g.value}
                      label={g.label}
                      hint={g.hint}
                      active={wizard.goal === g.value}
                      onClick={() => setWizard((w) => ({ ...w, goal: g.value }))}
                    />
                  ))}
                </div>
              </div>
            )}

            {STEPS[step] === "profile" && (
              <div>
                <h1 className="mb-1 font-display text-2xl font-bold">Tell us about you</h1>
                <p className="mb-6 text-muted">Used for an accurate metabolic estimate.</p>
                <div className="mb-4 flex gap-3">
                  {(["female", "male"] as Sex[]).map((sex) => (
                    <button
                      key={sex}
                      type="button"
                      onClick={() => setWizard((w) => ({ ...w, sex }))}
                      className={cn(
                        "flex-1 rounded-2xl border py-3 text-sm font-medium capitalize transition-colors",
                        wizard.sex === sex ? "border-accent-ink bg-accent/20" : "border-border bg-surface-2",
                      )}
                    >
                      {sex}
                    </button>
                  ))}
                </div>
                <Label htmlFor="birthDateInput">Date of birth</Label>
                <Input
                  id="birthDateInput"
                  type="date"
                  value={wizard.birthDate}
                  onChange={(e) => setWizard((w) => ({ ...w, birthDate: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            )}

            {STEPS[step] === "body" && (
              <div>
                <h1 className="mb-1 font-display text-2xl font-bold">Height &amp; weight</h1>
                <p className="mb-6 text-muted">You can update this anytime in your profile.</p>
                <div className="flex flex-col gap-4">
                  <div>
                    <Label htmlFor="heightInput">Height (cm)</Label>
                    <Input
                      id="heightInput"
                      type="number"
                      inputMode="decimal"
                      value={wizard.heightCm}
                      onChange={(e) => setWizard((w) => ({ ...w, heightCm: e.target.value }))}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="weightInput">Weight (kg)</Label>
                    <Input
                      id="weightInput"
                      type="number"
                      inputMode="decimal"
                      value={wizard.weightKg}
                      onChange={(e) => setWizard((w) => ({ ...w, weightKg: e.target.value }))}
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>
            )}

            {STEPS[step] === "activity" && (
              <div>
                <h1 className="mb-1 font-display text-2xl font-bold">Activity level</h1>
                <p className="mb-6 text-muted">How active are you in a typical week?</p>
                <div className="flex flex-col gap-3">
                  {ACTIVITY.map((a) => (
                    <OptionCard
                      key={a.value}
                      label={a.label}
                      hint={a.hint}
                      active={wizard.activityLevel === a.value}
                      onClick={() => setWizard((w) => ({ ...w, activityLevel: a.value }))}
                    />
                  ))}
                </div>
              </div>
            )}

            {STEPS[step] === "review" && (
              <div>
                <h1 className="mb-1 font-display text-2xl font-bold">Your daily targets</h1>
                <p className="mb-6 text-muted">Calculated from what you told us.</p>
                {preview ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 rounded-2xl bg-accent/20 p-4 text-center">
                      <p data-testid="preview-calorie-target" className="font-display text-3xl font-bold tabular-nums">
                        {preview.calorieTarget}
                      </p>
                      <p className="text-sm text-muted">kcal / day</p>
                    </div>
                    <div className="rounded-2xl bg-surface-2 p-3 text-center">
                      <p className="font-display text-lg font-semibold tabular-nums">{preview.proteinTarget}g</p>
                      <p className="text-xs text-muted">Protein</p>
                    </div>
                    <div className="rounded-2xl bg-surface-2 p-3 text-center">
                      <p className="font-display text-lg font-semibold tabular-nums">{preview.carbTarget}g</p>
                      <p className="text-xs text-muted">Carbs</p>
                    </div>
                    <div className="rounded-2xl bg-surface-2 p-3 text-center">
                      <p className="font-display text-lg font-semibold tabular-nums">{preview.fatTarget}g</p>
                      <p className="text-xs text-muted">Fat</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-fat">Missing info — go back and fill in every step.</p>
                )}
                {state?.message && <p className="mt-4 text-sm text-fat">{state.message}</p>}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <Button type="button" variant="outline" size="lg" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            size="lg"
            className="flex-1"
            disabled={!canAdvance}
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
          </Button>
        ) : (
          <Button type="submit" size="lg" className="flex-1" disabled={pending || !preview}>
            {pending ? "Setting up…" : "Start tracking"}
          </Button>
        )}
      </div>
    </form>
  );
}

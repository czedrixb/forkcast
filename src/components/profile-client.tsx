"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { addWeight, updateProfileTargets } from "@/actions/tracking";
import { logout } from "@/actions/auth";
import type { UsageSummary } from "@/lib/billing/usage";

type Profile = {
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  weightKg: number;
  goal: string;
};

function formatResetDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ProfileClient({
  name,
  email,
  profile,
  usage,
  planLabel,
}: {
  name: string;
  email: string;
  profile: Profile;
  usage: UsageSummary;
  planLabel: string;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const [weight, setWeight] = useState(String(profile.weightKg));
  const [targets, setTargets] = useState({
    calorieTarget: profile.calorieTarget,
    proteinTarget: profile.proteinTarget,
    carbTarget: profile.carbTarget,
    fatTarget: profile.fatTarget,
  });

  function handleLogWeight() {
    const value = Number(weight);
    if (!value) return;
    startTransition(async () => {
      await addWeight(value);
      router.refresh();
    });
  }

  function handleSaveTargets() {
    startTransition(async () => {
      await updateProfileTargets(targets);
      router.refresh();
    });
  }

  return (
    <main className="mx-auto max-w-md px-5 pt-8 pb-8">
      <h1 className="mb-1 font-display text-xl font-semibold">{name}</h1>
      <p className="mb-6 text-sm text-muted">{email}</p>

      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <div className="flex gap-2">
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setTheme("dark")}
            >
              <Moon className="h-4 w-4" /> Dark
            </Button>
            <Button
              variant={theme === "light" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setTheme("light")}
            >
              <Sun className="h-4 w-4" /> Light
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan</CardTitle>
            <span
              data-testid="profile-plan-badge"
              className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium"
            >
              {planLabel}
            </span>
          </CardHeader>
          <p data-testid="profile-usage" className="text-sm text-muted">
            {usage.remaining} of {usage.allowance} scans left this period · resets {formatResetDate(usage.resetAt)}
          </p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weight</CardTitle>
          </CardHeader>
          <div className="flex gap-2">
            <Input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleLogWeight} disabled={isPending}>
              Log
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily targets</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="calorieTarget">Calories</Label>
              <Input
                id="calorieTarget"
                type="number"
                value={targets.calorieTarget}
                onChange={(e) => setTargets((t) => ({ ...t, calorieTarget: Number(e.target.value) }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="proteinTarget">Protein (g)</Label>
              <Input
                id="proteinTarget"
                type="number"
                value={targets.proteinTarget}
                onChange={(e) => setTargets((t) => ({ ...t, proteinTarget: Number(e.target.value) }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="carbTarget">Carbs (g)</Label>
              <Input
                id="carbTarget"
                type="number"
                value={targets.carbTarget}
                onChange={(e) => setTargets((t) => ({ ...t, carbTarget: Number(e.target.value) }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fatTarget">Fat (g)</Label>
              <Input
                id="fatTarget"
                type="number"
                value={targets.fatTarget}
                onChange={(e) => setTargets((t) => ({ ...t, fatTarget: Number(e.target.value) }))}
                className="mt-1"
              />
            </div>
          </div>
          <Button className="mt-4 w-full" onClick={handleSaveTargets} disabled={isPending}>
            Save targets
          </Button>
        </Card>

        <form action={logout}>
          <Button type="submit" variant="destructive" size="lg" className="w-full">
            <LogOut className="h-4 w-4" /> Log out
          </Button>
        </form>
      </div>
    </main>
  );
}

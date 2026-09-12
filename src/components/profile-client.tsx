"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { addWeight, updateProfileTargets } from "@/actions/tracking";
import { logout } from "@/actions/auth";
import type { UsageSummary } from "@/lib/billing/usage";
import type { BillingInterval } from "@prisma/client";

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

// Distinct from formatResetDate: a paid-through date can be up to a year
// out (annual plans), so it needs the year shown -- the short scan-reset
// date never does, since that's always within the current period.
function formatFullDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export function ProfileClient({
  name,
  email,
  profile,
  usage,
  planLabel,
  interval,
  proUntil,
  cancelAtPeriodEnd,
  stripeConfigured,
}: {
  name: string;
  email: string;
  profile: Profile;
  usage: UsageSummary;
  planLabel: string;
  interval: BillingInterval | null;
  proUntil: string | null;
  cancelAtPeriodEnd: boolean;
  stripeConfigured: boolean;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const [isBillingPending, setIsBillingPending] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
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

  async function openBillingPortal() {
    setBillingError(null);
    setIsBillingPending(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setBillingError(data.error ?? "Could not open billing management.");
        setIsBillingPending(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setBillingError("Could not open billing management.");
      setIsBillingPending(false);
    }
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

          {usage.plan === "pro" ? (
            <div className="mt-4 flex flex-col gap-3">
              <p data-testid="profile-plan-detail" className="text-sm text-muted">
                {interval === "annual" ? "Annual" : "Monthly"} plan
                {proUntil &&
                  ` · ${cancelAtPeriodEnd ? "Access until" : "Renews"} ${formatFullDate(proUntil)}`}
              </p>
              <Button
                variant="outline"
                onClick={openBillingPortal}
                disabled={isBillingPending || !stripeConfigured}
                data-testid="profile-manage-billing"
              >
                {isBillingPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Manage billing"}
              </Button>
              {!stripeConfigured && <p className="text-xs text-muted">Billing management is unavailable right now.</p>}
            </div>
          ) : (
            <Button asChild className="mt-4 w-full" data-testid="profile-explore-pro">
              <Link href="/pricing">Explore Pro</Link>
            </Button>
          )}
          {billingError && <p className="mt-2 text-sm text-fat">{billingError}</p>}
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

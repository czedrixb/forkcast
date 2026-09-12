"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Sparkles, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BillingInterval } from "@prisma/client";

type Pricing = {
  monthly: { amountPhp: number; allowance: number };
  annual: { amountPhp: number; allowance: number };
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function php(amount: number): string {
  return amount.toLocaleString("en-US");
}

function PlanCard({
  active,
  label,
  badge,
  price,
  subline,
  onClick,
  testId,
}: {
  active: boolean;
  label: string;
  badge?: string;
  price: string;
  subline: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      data-testid={testId}
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1 rounded-2xl border p-4 text-left transition-colors",
        active ? "border-accent-ink bg-accent/20" : "border-border bg-surface-2 hover:border-muted",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        {active && <Check className="h-4 w-4 shrink-0 text-accent-ink" />}
      </div>
      {badge && (
        <span className="w-fit rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-fg">{badge}</span>
      )}
      <p className="mt-1 font-display text-lg font-bold tabular-nums">{price}</p>
      <p className="text-xs text-muted">{subline}</p>
    </button>
  );
}

export function PricingClient({
  plan,
  planLabel,
  interval,
  proUntil,
  cancelAtPeriodEnd,
  pricing,
  annualMonthlyEquivalentPhp,
  annualSavingsPhp,
  stripeConfigured,
  fromScan,
  checkoutCancelled,
}: {
  plan: "free" | "pro";
  planLabel: string;
  interval: BillingInterval | null;
  proUntil: string | null;
  cancelAtPeriodEnd: boolean;
  pricing: Pricing;
  annualMonthlyEquivalentPhp: number;
  annualSavingsPhp: number;
  stripeConfigured: boolean;
  fromScan: boolean;
  checkoutCancelled: boolean;
}) {
  const [selected, setSelected] = useState<BillingInterval>("annual");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backHref = fromScan ? "/scan" : "/profile";

  async function startCheckout() {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ interval: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start checkout.");
        setIsSubmitting(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not start checkout.");
      setIsSubmitting(false);
    }
  }

  async function openBillingPortal() {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not open billing management.");
        setIsSubmitting(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not open billing management.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pt-8">
      <Button asChild variant="ghost" size="icon" className="mb-4 -ml-2 w-fit">
        <Link href={backHref} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </Button>

      <h1 className="mb-1 font-display text-xl font-semibold">Forkcast Pro</h1>
      <p className="mb-6 text-muted">
        {fromScan ? "Continue scanning meals with 100 AI scans every month." : "More confidence in every food log."}
      </p>

      <div className="mb-6 flex items-center justify-center gap-3 rounded-[28px] bg-accent/10 py-8">
        <Camera className="h-8 w-8 text-accent-ink" />
        <div className="h-px w-6 bg-accent-ink/40" />
        <Sparkles className="h-8 w-8 text-accent-ink" />
      </div>

      {plan === "pro" ? (
        <Card data-testid="pricing-already-pro" className="flex flex-col gap-4">
          <div>
            <p className="font-medium">You&apos;re on {planLabel}</p>
            <p className="text-sm text-muted">
              {interval === "annual" ? "Annual" : "Monthly"} plan
              {proUntil && ` · ${cancelAtPeriodEnd ? "Access until" : "Renews"} ${formatDate(proUntil)}`}
            </p>
          </div>
          <Button
            size="lg"
            onClick={openBillingPortal}
            disabled={isSubmitting || !stripeConfigured}
            data-testid="profile-manage-billing"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Manage billing"}
          </Button>
          {!stripeConfigured && <p className="text-xs text-muted">Billing management is unavailable right now.</p>}
          {error && <p className="text-sm text-fat">{error}</p>}
        </Card>
      ) : (
        <>
          <ul className="mb-6 flex flex-col gap-2 text-sm">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-accent-ink" /> 100 AI food scans every month
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-accent-ink" /> Keep all Free features
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-accent-ink" /> 100 scans every month on both monthly and annual
            </li>
          </ul>

          <div role="radiogroup" aria-label="Choose a plan" className="grid grid-cols-2 gap-3">
            <PlanCard
              testId="pricing-plan-monthly"
              label="Monthly"
              price={`PHP ${php(pricing.monthly.amountPhp)} / month`}
              subline="Billed monthly"
              active={selected === "monthly"}
              onClick={() => setSelected("monthly")}
            />
            <PlanCard
              testId="pricing-plan-annual"
              label="Annual"
              badge="Best value"
              price={`PHP ${php(pricing.annual.amountPhp)} / year`}
              subline={`PHP ${php(annualMonthlyEquivalentPhp)}/month · Save PHP ${php(annualSavingsPhp)}`}
              active={selected === "annual"}
              onClick={() => setSelected("annual")}
            />
          </div>

          <div className="mt-6 rounded-[28px] border border-border bg-surface p-4">
            {stripeConfigured ? (
              <>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={startCheckout}
                  disabled={isSubmitting}
                  data-testid="pricing-cta"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upgrade to Pro"}
                </Button>
                <p className="mt-2 text-center text-xs text-muted">
                  You&apos;ll be charged PHP {php(pricing[selected].amountPhp)} every {selected === "annual" ? "year" : "month"}.
                </p>
              </>
            ) : (
              <>
                <Button size="lg" className="w-full" disabled data-testid="pricing-unavailable">
                  Checkout unavailable
                </Button>
                <Button asChild variant="outline" size="lg" className="mt-2 w-full">
                  <Link href="/today">Continue with Free</Link>
                </Button>
              </>
            )}
            {error && <p className="mt-2 text-center text-sm text-fat">{error}</p>}
            <p data-testid="pricing-terms" className="mt-2 text-center text-xs text-muted">
              Demo checkout — no real charges. Cancel anytime from Profile.
            </p>
          </div>

          {checkoutCancelled && (
            <p className="mt-4 text-sm text-muted">Checkout cancelled — nothing was charged.</p>
          )}
          {fromScan && (
            <Button asChild variant="outline" size="lg" className="mt-4">
              <Link href="/search">Add food manually</Link>
            </Button>
          )}

          <details className="mt-6 mb-6 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm">
            <summary className="cursor-pointer font-medium">Compare Free and Pro</summary>
            <div className="mt-3 grid grid-cols-3 gap-y-2 text-xs">
              <span className="text-muted">&nbsp;</span>
              <span className="text-center font-medium">Free</span>
              <span className="text-center font-medium text-accent-ink">Pro</span>
              <span className="text-muted">AI scans / month</span>
              <span className="text-center">5</span>
              <span className="text-center font-medium">100</span>
              <span className="text-muted">Manual logging &amp; search</span>
              <span className="text-center">✓</span>
              <span className="text-center">✓</span>
              <span className="text-muted">Progress insights</span>
              <span className="text-center">✓</span>
              <span className="text-center">✓</span>
            </div>
          </details>
        </>
      )}
    </main>
  );
}

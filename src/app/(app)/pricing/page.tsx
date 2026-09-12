import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getEntitlement } from "@/lib/billing/entitlements";
import { PLAN_LABELS, PLAN_PRICING, ANNUAL_MONTHLY_EQUIVALENT_PHP, ANNUAL_SAVINGS_PHP } from "@/lib/billing/plans";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { PricingClient } from "@/components/pricing-client";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; checkout?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !user.profile) redirect("/login");

  const { from, checkout } = await searchParams;
  const entitlement = await getEntitlement(user.id);

  return (
    <PricingClient
      plan={entitlement.plan}
      planLabel={PLAN_LABELS[entitlement.plan]}
      interval={entitlement.subscription?.interval ?? null}
      proUntil={entitlement.proUntil?.toISOString() ?? null}
      cancelAtPeriodEnd={entitlement.subscription?.cancelAtPeriodEnd ?? false}
      pricing={PLAN_PRICING}
      annualMonthlyEquivalentPhp={ANNUAL_MONTHLY_EQUIVALENT_PHP}
      annualSavingsPhp={ANNUAL_SAVINGS_PHP}
      stripeConfigured={isStripeConfigured()}
      fromScan={from === "scan"}
      checkoutCancelled={checkout === "cancelled"}
    />
  );
}

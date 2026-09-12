import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getEntitlement } from "@/lib/billing/entitlements";
import { getUsageSummary } from "@/lib/billing/usage";
import { PLAN_LABELS } from "@/lib/billing/plans";
import { isStripeConfigured } from "@/lib/billing/stripe";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const [entitlement, usage] = await Promise.all([getEntitlement(user.id), getUsageSummary(user.id)]);

  return NextResponse.json({
    plan: entitlement.plan,
    planLabel: PLAN_LABELS[entitlement.plan],
    interval: entitlement.subscription?.interval ?? null,
    proUntil: entitlement.proUntil?.toISOString() ?? null,
    cancelAtPeriodEnd: entitlement.subscription?.cancelAtPeriodEnd ?? false,
    usage,
    stripeConfigured: isStripeConfigured(),
  });
}

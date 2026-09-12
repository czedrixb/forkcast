import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getUsageSummary } from "@/lib/billing/usage";
import { getEntitlement } from "@/lib/billing/entitlements";
import { PLAN_LABELS } from "@/lib/billing/plans";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { ProfileClient } from "@/components/profile-client";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user || !user.profile) redirect("/login");

  const [usage, entitlement] = await Promise.all([getUsageSummary(user.id), getEntitlement(user.id)]);

  return (
    <ProfileClient
      name={user.name}
      email={user.email}
      profile={user.profile}
      usage={usage}
      planLabel={PLAN_LABELS[usage.plan]}
      interval={entitlement.subscription?.interval ?? null}
      proUntil={entitlement.proUntil?.toISOString() ?? null}
      cancelAtPeriodEnd={entitlement.subscription?.cancelAtPeriodEnd ?? false}
      stripeConfigured={isStripeConfigured()}
    />
  );
}

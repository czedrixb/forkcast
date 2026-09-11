import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getUsageSummary } from "@/lib/billing/usage";
import { PLAN_LABELS } from "@/lib/billing/plans";
import { ProfileClient } from "@/components/profile-client";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user || !user.profile) redirect("/login");

  const usage = await getUsageSummary(user.id);

  return (
    <ProfileClient
      name={user.name}
      email={user.email}
      profile={user.profile}
      usage={usage}
      planLabel={PLAN_LABELS[usage.plan]}
    />
  );
}

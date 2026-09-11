import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getUsageSummary } from "@/lib/billing/usage";
import { ScanFlow } from "@/components/scan-flow";

export default async function ScanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const usage = await getUsageSummary(user.id);

  return <ScanFlow initialUsage={usage} />;
}

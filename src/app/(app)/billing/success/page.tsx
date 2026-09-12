import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { BillingConfirmation } from "@/components/billing-confirmation";

export default async function BillingSuccessPage() {
  const user = await getCurrentUser();
  if (!user || !user.profile) redirect("/login");

  return <BillingConfirmation />;
}

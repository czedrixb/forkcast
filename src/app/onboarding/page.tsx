import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { OnboardingWizard } from "@/components/onboarding-wizard";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile) redirect("/today");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <OnboardingWizard />
    </main>
  );
}

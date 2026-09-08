import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { CalorieRing } from "@/components/calorie-ring";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.profile ? "/today" : "/onboarding");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-8">
        <CalorieRing consumed={1450} target={2100} size={200} />
      </div>

      <h1 className="font-display text-3xl font-bold leading-tight">
        Point. Scan. <span className="text-accent-ink">Know.</span>
      </h1>
      <p className="mt-3 max-w-xs text-muted">
        Forkcast reads your plate with AI and tracks calories and macros
        automatically — no barcodes, no guessing.
      </p>

      <div className="mt-8 flex w-full flex-col gap-3">
        <Button asChild size="lg" className="w-full">
          <Link href="/signup">Get started</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href="/login">I already have an account</Link>
        </Button>
      </div>
    </main>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PartyPopper, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/confetti";

type Status = { plan: "free" | "pro"; planLabel: string; usage?: { allowance: number } };
type PollState = "pending" | "confirmed" | "timeout";

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 15; // ~30s bounded window

export function BillingConfirmation() {
  const [state, setState] = useState<PollState>("pending");
  const [status, setStatus] = useState<Status | null>(null);
  const attempts = useRef(0);

  const check = useCallback(async () => {
    const res = await fetch("/api/billing/status");
    if (!res.ok) return;
    const data: Status = await res.json();
    setStatus(data);
    if (data.plan === "pro") {
      setState("confirmed");
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      while (!cancelled && attempts.current < MAX_ATTEMPTS) {
        attempts.current += 1;
        const done = await check();
        if (done || cancelled) return;
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      if (!cancelled) setState((s) => (s === "confirmed" ? s : "timeout"));
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [check]);

  function handleRefresh() {
    attempts.current = 0;
    setState("pending");
    check();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-16 text-center">
      {state === "pending" && (
        <>
          <Loader2 className="mb-4 h-8 w-8 animate-spin text-accent-ink" />
          <h1 data-testid="billing-confirmation-state" className="mb-1 font-display text-xl font-semibold">
            Confirming your demo subscription…
          </h1>
          <p className="text-sm text-muted">
            Access is granted only after your payment is verified server-side. This usually takes a few seconds.
          </p>
        </>
      )}

      {state === "confirmed" && status && (
        <>
          <Confetti />
          <div className="mb-5 flex h-20 w-20 animate-in items-center justify-center rounded-full bg-accent/15 zoom-in duration-500">
            <PartyPopper className="h-10 w-10 text-accent-ink" />
          </div>
          <h1 data-testid="billing-confirmation-state" className="mb-2 font-display text-2xl font-bold">
            Welcome to {status.planLabel}
          </h1>
          <p className="mb-6 text-sm text-muted">
            {status.usage
              ? `You now have ${status.usage.allowance} AI scans every month. Enjoy the extra headroom — you've earned it.`
              : "Your scan allowance has been updated."}
          </p>
          <Button asChild size="lg">
            <Link href="/scan">Start scanning</Link>
          </Button>
        </>
      )}

      {state === "timeout" && (
        <>
          <h1 data-testid="billing-confirmation-state" className="mb-1 font-display text-xl font-semibold">
            Still confirming…
          </h1>
          <p className="mb-6 text-sm text-muted">
            This is taking longer than expected. Your payment may still be processing — refresh to check again.
          </p>
          <Button size="lg" onClick={handleRefresh}>
            Refresh status
          </Button>
        </>
      )}
    </main>
  );
}

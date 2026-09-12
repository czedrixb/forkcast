"use client";

import Link from "next/link";
import { Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";

function formatResetDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Slides in from the bottom of the Scan page when the user taps "Take a
 * photo" or "Upload from library" with zero scans remaining -- catches the
 * soft paywall before a camera/file picker opens, instead of only after a
 * wasted round trip to /api/scan returns SCAN_QUOTA_EXCEEDED.
 */
export function ScanQuotaSheet({
  open,
  onOpenChange,
  resetAt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resetAt: string | Date;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent data-testid="scan-quota-sheet">
        <div className="mb-4 flex items-center gap-1.5 text-sm text-muted">
          <Zap className="h-4 w-4 shrink-0" />
          You&apos;ve used all your scans for this period
        </div>

        <SheetTitle>Forkcast Pro</SheetTitle>
        <SheetDescription className="mt-1">
          Get 100 AI food scans every month and keep all your Free features.
        </SheetDescription>

        <ul className="mt-4 flex flex-col gap-2 text-sm">
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-accent-ink" /> 100 AI food scans every month
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-accent-ink" /> Keep all Free features
          </li>
        </ul>

        <div className="mt-6 flex flex-col gap-3">
          <Button asChild size="lg" data-testid="scan-quota-sheet-upgrade">
            <Link href="/pricing?from=scan">Upgrade to Pro</Link>
          </Button>
          <Button asChild variant="outline" size="lg" data-testid="scan-quota-sheet-manual">
            <Link href="/search">Add food manually</Link>
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-muted">Your Free scans reset {formatResetDate(resetAt)}.</p>
      </SheetContent>
    </Sheet>
  );
}

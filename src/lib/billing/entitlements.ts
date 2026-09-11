import "server-only";

import { cache } from "react";
import { db } from "@/lib/db";
import type { Subscription } from "@prisma/client";

export type Entitlement = {
  plan: "free" | "pro";
  /** The Subscription currently granting Pro access, if any. */
  subscription: Subscription | null;
  /** When Pro access lapses (equal to subscription.paidThroughAt when plan === "pro"). */
  proUntil: Date | null;
};

/**
 * Derives Free/Pro access for a user. Deliberately does NOT check
 * `status === "active"` -- per docs/stripe-paywall-plan.md, access requires
 * confirmed payment coverage (`paidThroughAt` in the future), independent of
 * the Stripe-mirrored status. A `cancelAtPeriodEnd` subscription needs no
 * special case: it keeps Pro until `paidThroughAt` passes, which this same
 * predicate already handles.
 *
 * Cached per-request via React `cache()`, same pattern as getCurrentUser
 * (src/lib/auth/session.ts), so callers can call this freely without
 * worrying about duplicate queries within one request.
 */
export const getEntitlement = cache(async (userId: string): Promise<Entitlement> => {
  const subscription = await db.subscription.findFirst({
    where: {
      userId,
      status: { not: "incomplete" },
      paidThroughAt: { gt: new Date() },
    },
    orderBy: { paidThroughAt: "desc" },
  });

  if (!subscription) {
    return { plan: "free", subscription: null, proUntil: null };
  }

  return { plan: "pro", subscription, proUntil: subscription.paidThroughAt };
});

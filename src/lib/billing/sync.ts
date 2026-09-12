import "server-only";

import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripe, intervalForPriceId } from "@/lib/billing/stripe";
import type { SubscriptionStatus } from "@prisma/client";

/** Gets this user's test-mode Stripe customer, creating one (and a BillingAccount row) on first use. */
export async function getOrCreateBillingAccount(userId: string, email: string): Promise<string> {
  const existing = await db.billingAccount.findUnique({ where: { userId } });
  if (existing) return existing.stripeCustomerId;

  const customer = await getStripe().customers.create({ email, metadata: { userId } });
  await db.billingAccount.create({
    data: { userId, stripeCustomerId: customer.id, livemode: customer.livemode },
  });
  return customer.id;
}

function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing": // no trials are offered; treat defensively rather than reject
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
    case "paused":
      return "canceled";
    default:
      return "incomplete";
  }
}

/**
 * Reconciles one Stripe subscription into the local Subscription row. This is
 * the single writer of Pro access (see docs/stripe-paywall-plan.md) -- every
 * webhook handler funnels through here instead of trusting its own event
 * payload, which is what makes out-of-order/duplicate delivery safe.
 *
 * Re-retrieves current state from Stripe rather than trusting the event
 * payload. `fallback` is used only if that retrieval itself fails (e.g. the
 * subscription is already gone) -- normally this never triggers.
 */
export async function reconcileSubscription(stripeSubscriptionId: string, fallback?: Stripe.Subscription): Promise<void> {
  const stripe = getStripe();

  let subscription: Stripe.Subscription;
  try {
    subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ["latest_invoice"],
    });
  } catch (err) {
    if (!fallback) throw err;
    subscription = fallback;
  }

  const item = subscription.items.data[0];
  if (!item) {
    console.error("[billing] subscription has no items", stripeSubscriptionId);
    return;
  }

  const interval = intervalForPriceId(item.price.id);
  if (!interval) {
    console.error("[billing] unrecognized price id on subscription", stripeSubscriptionId, item.price.id);
    return;
  }

  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const billingAccount = await db.billingAccount.findUnique({ where: { stripeCustomerId: customerId } });
  if (!billingAccount) {
    console.error("[billing] no BillingAccount for stripe customer", customerId);
    return;
  }
  const userId = billingAccount.userId;

  const metadataUserId = subscription.metadata?.userId;
  if (metadataUserId && metadataUserId !== userId) {
    console.error("[billing] subscription metadata userId mismatch", stripeSubscriptionId, metadataUserId, userId);
    return;
  }

  const latestInvoice = subscription.latest_invoice && typeof subscription.latest_invoice !== "string" ? subscription.latest_invoice : null;
  const invoiceCoversPeriod = latestInvoice?.status === "paid";
  const currentPeriodStart = new Date(item.current_period_start * 1000);
  const currentPeriodEnd = new Date(item.current_period_end * 1000);

  await db.$transaction(async (tx) => {
    // Serializes concurrent/out-of-order webhook deliveries for the same
    // subscription so they can't interleave reads and writes of it.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${stripeSubscriptionId}))`;

    const existing = await tx.subscription.findUnique({ where: { stripeSubscriptionId } });

    // Anchors annual Pro's monthly usage windows (see monthBoundsFromAnchor
    // in usage.ts) -- set once at creation and never touched again, so a
    // later renewal/update event can't drift it.
    const usageAnchorAt = existing?.usageAnchorAt ?? new Date(subscription.start_date * 1000);

    // paidThroughAt only ever advances on confirmed payment coverage for a
    // later period than what's already stored -- a stale/out-of-order event
    // (e.g. a delayed retry of an old invoice) can't roll access backward or
    // re-grant an already-lapsed period.
    const candidatePaidThroughAt = invoiceCoversPeriod ? currentPeriodEnd : null;
    const paidThroughAt =
      candidatePaidThroughAt && (!existing?.paidThroughAt || candidatePaidThroughAt > existing.paidThroughAt)
        ? candidatePaidThroughAt
        : (existing?.paidThroughAt ?? null);

    const data = {
      userId,
      interval,
      status: mapStatus(subscription.status),
      currentPeriodStart,
      currentPeriodEnd,
      paidThroughAt,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      stripeCustomerId: customerId,
      stripePriceId: item.price.id,
    };

    await tx.subscription.upsert({
      where: { stripeSubscriptionId },
      create: { ...data, stripeSubscriptionId, usageAnchorAt },
      update: data,
    });
  });
}

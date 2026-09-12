import "server-only";

import Stripe from "stripe";
import type { BillingInterval } from "@prisma/client";

// Pinned to the version bundled with the installed `stripe` package
// (node_modules/stripe/cjs/apiVersion.js) rather than left to drift.
const API_VERSION = "2026-08-26.dahlia" as const;

/**
 * Portfolio-mode guard (see docs/stripe-paywall-plan.md): this deployment
 * must never accept live Stripe keys or process livemode webhook events,
 * regardless of what's configured. Defaults to "test" so a missing
 * BILLING_MODE fails closed toward the safer setting.
 */
export function isTestMode(): boolean {
  return process.env.BILLING_MODE !== "live";
}

function readPriceId(interval: BillingInterval): string | undefined {
  return interval === "monthly"
    ? process.env.STRIPE_PRICE_PRO_MONTHLY
    : process.env.STRIPE_PRICE_PRO_ANNUAL;
}

/** Whether checkout/portal can be offered at all -- every piece required to create a session. */
export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_PRO_MONTHLY &&
      process.env.STRIPE_PRICE_PRO_ANNUAL &&
      process.env.APP_URL,
  );
}

/** Whether incoming webhook deliveries can be verified. Checked separately from isStripeConfigured. */
export function isWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET);
}

/** The allowlisted Stripe Price ID for a trusted plan interval, or null if unset. Never derive a Price ID any other way. */
export function priceIdForInterval(interval: BillingInterval): string | null {
  return readPriceId(interval) ?? null;
}

/** The plan interval for an allowlisted Price ID, or null for anything else -- webhook reconciliation must never trust a Stripe object's price id without this check. */
export function intervalForPriceId(priceId: string): BillingInterval | null {
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) return "monthly";
  if (priceId === process.env.STRIPE_PRICE_PRO_ANNUAL) return "annual";
  return null;
}

let client: Stripe | null = null;

/**
 * Lazy Stripe client singleton. Throws if unconfigured or if a live secret
 * key is present while this deployment is pinned to test mode -- callers
 * must check isStripeConfigured() first and treat that as a normal,
 * user-facing "Checkout unavailable" state, not an error path.
 */
export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing)");
  }
  if (isTestMode() && secretKey.startsWith("sk_live_")) {
    throw new Error("Refusing to use a live Stripe secret key in test/portfolio mode");
  }

  if (!client) {
    client = new Stripe(secretKey, { apiVersion: API_VERSION });
  }
  return client;
}

import "server-only";

// Phase 1 of the paywall (see docs/stripe-paywall-plan.md): the quota and
// entitlement foundation. There is no Stripe integration yet -- Pro is
// granted by scripts/grant-pro.ts, a dev-only stand-in that Phase 2 replaces
// with webhook-driven reconciliation. This file is the single source of
// truth for allowances/prices so the future pricing page reads the same
// numbers this layer enforces.

export const FREE_SCAN_ALLOWANCE = 5;
export const PRO_SCAN_ALLOWANCE = 100;

/**
 * Free's scan allowance resets on calendar months in this IANA zone. Manila
 * is a fixed UTC+8 with no DST, which is what lets monthBoundsInZone (see
 * usage.ts) get away with a fixed-offset assumption instead of a full tz
 * database lookup.
 */
export const BILLING_TIMEZONE = "Asia/Manila";

/**
 * A `pending` ScanReservation older than this is presumed abandoned (crash,
 * timeout, dropped connection) and is swept back to `released` the next time
 * this user attempts a reservation. Chosen well above realistic AI-call
 * latency so an in-flight request is never swept out from under itself.
 */
export const STALE_RESERVATION_MS = 5 * 60_000;

export const PLAN_LABELS: Record<"free" | "pro", string> = {
  free: "Free",
  pro: "Pro · Demo",
};

/** Proposed PHP prices from docs/stripe-paywall-plan.md -- not wired to Stripe yet. */
export const PLAN_PRICING = {
  monthly: { amountPhp: 399, allowance: PRO_SCAN_ALLOWANCE },
  annual: { amountPhp: 3990, allowance: PRO_SCAN_ALLOWANCE },
} as const;

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getEntitlement } from "@/lib/billing/entitlements";
import { getOrCreateBillingAccount } from "@/lib/billing/sync";
import { getStripe, isStripeConfigured, priceIdForInterval } from "@/lib/billing/stripe";
import { CheckoutSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { interval } = parsed.data;

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Checkout is unavailable right now.", code: "STRIPE_NOT_CONFIGURED" }, { status: 503 });
  }

  const entitlement = await getEntitlement(user.id);
  if (entitlement.plan === "pro") {
    return NextResponse.json(
      { error: "You already have an active subscription.", code: "SUBSCRIPTION_EXISTS" },
      { status: 409 },
    );
  }

  const priceId = priceIdForInterval(interval);
  if (!priceId) {
    return NextResponse.json({ error: "Checkout is unavailable right now.", code: "STRIPE_NOT_CONFIGURED" }, { status: 503 });
  }

  const customerId = await getOrCreateBillingAccount(user.id, user.email);
  const appUrl = process.env.APP_URL as string;

  // A deterministic, hour-bucketed idempotency key: a double-click or retry
  // within the same hour replays the same Checkout Session (Sessions live
  // 24h, so a bucket's session is never expired within its own hour) instead
  // of creating a duplicate. An intentional new attempt an hour later gets a
  // fresh session, which is fine -- an abandoned session simply expires.
  const hourBucket = Math.floor(Date.now() / (60 * 60 * 1000));
  const idempotencyKey = `checkout:${user.id}:${interval}:${hourBucket}`;

  const session = await getStripe().checkout.sessions.create(
    {
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      metadata: { userId: user.id },
      subscription_data: { metadata: { userId: user.id } },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
    },
    { idempotencyKey },
  );

  if (!session.url) {
    return NextResponse.json({ error: "Could not start checkout" }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}

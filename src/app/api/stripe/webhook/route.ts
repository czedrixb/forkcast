import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripe, isTestMode, isWebhookConfigured } from "@/lib/billing/stripe";
import { reconcileSubscription } from "@/lib/billing/sync";

const HANDLED_TYPES = new Set([
  "checkout.session.completed",
  "invoice.paid",
  "invoice.payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

function subscriptionIdFor(event: Stripe.Event): { id: string; fallback?: Stripe.Subscription } | null {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const sub = session.subscription;
      if (!sub) return null;
      return { id: typeof sub === "string" ? sub : sub.id };
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const sub = invoice.parent?.subscription_details?.subscription;
      if (!sub) return null;
      return { id: typeof sub === "string" ? sub : sub.id };
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      return { id: subscription.id, fallback: subscription };
    }
    default:
      return null;
  }
}

export async function POST(request: Request) {
  if (!isWebhookConfigured()) {
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // The signature is computed over the exact raw bytes -- must read text
  // before any JSON parsing touches the body.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET as string);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.livemode && isTestMode()) {
    return NextResponse.json({ error: "Live-mode events are rejected in test mode" }, { status: 400 });
  }

  const existing = await db.stripeEvent.findUnique({ where: { id: event.id } });
  if (existing?.state === "processed") {
    return NextResponse.json({ received: true });
  }

  if (!HANDLED_TYPES.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  try {
    const target = subscriptionIdFor(event);
    if (target) {
      await reconcileSubscription(target.id, target.fallback);
    }

    await db.stripeEvent.upsert({
      where: { id: event.id },
      create: { id: event.id, type: event.type, livemode: event.livemode, state: "processed" },
      update: { state: "processed", lastError: null },
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[stripe webhook] processing failed", event.id, event.type, message);
    await db.stripeEvent.upsert({
      where: { id: event.id },
      create: { id: event.id, type: event.type, livemode: event.livemode, state: "failed", lastError: message },
      update: { state: "failed", lastError: message },
    });
    // 500 so Stripe retries -- this is treated as transient.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

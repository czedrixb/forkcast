import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Billing management is unavailable right now.", code: "STRIPE_NOT_CONFIGURED" }, { status: 503 });
  }

  // Only ever opens a portal session for this authenticated user's own
  // stored customer -- never accepts a customer id from the client.
  const billingAccount = await db.billingAccount.findUnique({ where: { userId: user.id } });
  if (!billingAccount) {
    return NextResponse.json({ error: "No billing account found." }, { status: 404 });
  }

  const appUrl = process.env.APP_URL as string;
  const session = await getStripe().billingPortal.sessions.create({
    customer: billingAccount.stripeCustomerId,
    return_url: `${appUrl}/profile`,
  });

  return NextResponse.json({ url: session.url });
}

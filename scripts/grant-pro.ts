import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Dev-only stopgap: grants Pro access to a user without going through
 * Stripe. Phase 2 of the paywall (see docs/stripe-paywall-plan.md) replaces
 * this with webhook-driven reconciliation of a real checkout — this script
 * is not a real entitlement path and must never run against a production
 * deployment.
 *
 * Usage: npx tsx scripts/grant-pro.ts <email> [monthly|annual]
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const [email, intervalArg] = process.argv.slice(2);
  const interval = intervalArg === "annual" ? "annual" : "monthly";

  if (!email) {
    console.error("Usage: npx tsx scripts/grant-pro.ts <email> [monthly|annual]");
    process.exit(1);
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  const now = new Date();
  const currentPeriodEnd = new Date(now);
  if (interval === "monthly") {
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
  } else {
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
  }

  const subscription = await db.subscription.create({
    data: {
      userId: user.id,
      interval,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd,
      paidThroughAt: currentPeriodEnd,
      usageAnchorAt: now,
    },
  });

  console.log(`Granted ${interval} Pro to ${email} (subscription ${subscription.id}), paid through ${currentPeriodEnd.toISOString()}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

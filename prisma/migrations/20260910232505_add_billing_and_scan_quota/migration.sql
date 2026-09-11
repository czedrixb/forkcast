-- CreateEnum
CREATE TYPE "BillingPlan" AS ENUM ('free', 'pro');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('monthly', 'annual');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('incomplete', 'active', 'past_due', 'canceled');

-- CreateEnum
CREATE TYPE "ReservationState" AS ENUM ('pending', 'consumed', 'released');

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'incomplete',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "paidThroughAt" TIMESTAMP(3),
    "usageAnchorAt" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageWindow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "plan" "BillingPlan" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "allowance" INTEGER NOT NULL,
    "consumed" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanReservation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "windowId" TEXT NOT NULL,
    "state" "ReservationState" NOT NULL DEFAULT 'pending',
    "scanResultId" TEXT,
    "responseJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "ScanReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_userId_paidThroughAt_idx" ON "Subscription"("userId", "paidThroughAt");

-- CreateIndex
CREATE INDEX "UsageWindow_userId_kind_endsAt_idx" ON "UsageWindow"("userId", "kind", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "UsageWindow_userId_kind_plan_startsAt_key" ON "UsageWindow"("userId", "kind", "plan", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScanReservation_scanResultId_key" ON "ScanReservation"("scanResultId");

-- CreateIndex
CREATE INDEX "ScanReservation_state_createdAt_idx" ON "ScanReservation"("state", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScanReservation_userId_requestKey_key" ON "ScanReservation"("userId", "requestKey");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageWindow" ADD CONSTRAINT "UsageWindow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanReservation" ADD CONSTRAINT "ScanReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanReservation" ADD CONSTRAINT "ScanReservation_windowId_fkey" FOREIGN KEY ("windowId") REFERENCES "UsageWindow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanReservation" ADD CONSTRAINT "ScanReservation_scanResultId_fkey" FOREIGN KEY ("scanResultId") REFERENCES "ScanResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable Row Level Security on the new tables, matching
-- 20260908161158_enable_rls: Supabase exposes every public-schema table to
-- PostgREST, and this app talks to Postgres only through Prisma (which uses
-- a role with BYPASSRLS). No policies are added, so RLS-enabled + no
-- policies means anon/authenticated get zero rows/writes via PostgREST
-- while Prisma is unaffected.
ALTER TABLE "public"."Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."UsageWindow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ScanReservation" ENABLE ROW LEVEL SECURITY;


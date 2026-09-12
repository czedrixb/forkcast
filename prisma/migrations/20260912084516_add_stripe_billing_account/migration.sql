-- CreateEnum
CREATE TYPE "StripeEventState" AS ENUM ('processed', 'failed');

-- CreateTable
CREATE TABLE "BillingAccount" (
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "livemode" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingAccount_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "livemode" BOOLEAN NOT NULL,
    "state" "StripeEventState" NOT NULL,
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingAccount_stripeCustomerId_key" ON "BillingAccount"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "StripeEvent_type_processedAt_idx" ON "StripeEvent"("type", "processedAt");

-- AddForeignKey
ALTER TABLE "BillingAccount" ADD CONSTRAINT "BillingAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable Row Level Security on the new tables, matching
-- 20260910232505_add_billing_and_scan_quota: Supabase exposes every
-- public-schema table to PostgREST, and this app talks to Postgres only
-- through Prisma (which uses a role with BYPASSRLS). No policies are added,
-- so RLS-enabled + no policies means anon/authenticated get zero rows/writes
-- via PostgREST while Prisma is unaffected.
ALTER TABLE "public"."BillingAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."StripeEvent" ENABLE ROW LEVEL SECURITY;

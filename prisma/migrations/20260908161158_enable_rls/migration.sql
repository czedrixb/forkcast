-- Enable Row Level Security on all public-schema tables.
--
-- Supabase exposes every table in `public` to PostgREST (the REST/GraphQL
-- API reachable with the project's anon/authenticated keys). This app talks
-- to Postgres only through Prisma, using the `postgres` role, which has
-- BYPASSRLS -- so RLS has zero effect on Prisma queries. It exists solely to
-- block direct PostgREST access to these tables.
--
-- No policies are added: with RLS enabled and no policies, anon/authenticated
-- get zero rows and zero write access via PostgREST, while Prisma is
-- unaffected.

ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Food" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LogEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ScanResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WeightEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WaterEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

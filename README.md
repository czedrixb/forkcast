# Forkcast

AI food tracker and calorie scanner — point your camera at a plate, get an
instant nutrition estimate, and track calories/macros for the day.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Framer Motion · Recharts ·
Supabase (Postgres) via Prisma 7 (`@prisma/adapter-pg`) · Anthropic Claude
(`claude-opus-5`) for the vision scan, falling back to OpenAI (`gpt-5.5`) and
then Gemini (`gemini-3.6-flash`) if a call fails.

## Getting started

```bash
npm install
cp .env.example .env      # fill in DATABASE_URL/DIRECT_URL (Supabase) and SESSION_SECRET
npx prisma migrate dev    # applies migrations to your Supabase database
npx prisma db seed        # seeds ~60 foods + a demo user with 2 weeks of history
npm run dev               # http://localhost:3200
```

Demo login: `demo@forkcast.app` / `demo1234`.

`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, and `GEMINI_API_KEY` are all optional,
but at least one is needed for `/scan` to work. It tries Anthropic, then
OpenAI, then Gemini — falling through to the next configured provider if a
call fails — and shows a friendly error if none succeed. `GEMINI_API_KEY` is
free from [Google AI Studio](https://aistudio.google.com/apikey), so it's a
good zero-cost key to set if you just want to try the scan feature. The E2E
suite stubs `/api/scan` directly, so it needs none of these keys.

## Paywall (Stripe, test mode only)

Free gives 5 AI scans/month; Pro (PHP 399/month or PHP 3,990/year) gives 100.
`/pricing` and the billing status screens always read "Demo checkout — no
real charges" and label the entitlement "Pro · Demo" — this deployment
refuses live Stripe keys and live webhook events (see
`src/lib/billing/stripe.ts`).

Without Stripe env vars set, `/pricing` shows "Checkout unavailable" and Free
access still works normally — nothing breaks. To exercise real Stripe test
checkout locally, uncomment and fill in the Stripe block in `.env.example`
(instructions inline) and run:

```bash
stripe listen --forward-to localhost:3200/api/stripe/webhook   # copy the signing secret into STRIPE_WEBHOOK_SECRET
```

To grant Pro without going through Stripe at all (e.g. to check the success
screen), use the dev-only stand-in script:

```bash
npx tsx scripts/grant-pro.ts <email> [monthly|annual]
```

See `docs/stripe-paywall-plan.md` for the full design.

## Testing

```bash
npm run test:e2e
```

Playwright drives the app on port 3200 across a desktop and a mobile
viewport, authenticating once as the seeded demo user (`e2e/auth.setup.ts`)
and reusing that session for the rest of the suite.

### Testing over HTTPS on the LAN (phone/mobile)

`/scan` needs `getUserMedia`, which browsers only allow in a secure context,
so testing the camera flow from a phone means serving the app over HTTPS at
your machine's LAN IP instead of `localhost`.

```bash
npm run dev:https   # binds to 0.0.0.0:3200 with certificates/localhost*.pem
```

`next.config.ts` lists the LAN IP in `allowedDevOrigins` — without it, Next's
dev-only cross-origin protection 403s every JS/RSC asset request from that
origin and the page renders but never hydrates. Update that IP if your
machine's LAN IP changes (DHCP).

To verify the LAN-IP origin is actually interactive, run the dedicated
Playwright config against an already-running `dev:https` server:

```bash
npx playwright test -c playwright.lan.config.ts
```

`playwright.lan.config.ts` and `e2e/lan-https.spec.ts` hardcode the LAN IP
(`https://192.168.1.58:3200`) and are excluded from the default `test:e2e`
run.

## Project layout

- `src/app` — routes (App Router), grouped into `(auth)` and `(app)` segments
- `src/components` — UI, feature components, and Recharts wrappers
- `src/actions` — Server Actions (auth, onboarding, logging, tracking)
- `src/lib` — DB client, auth/session, AI adapter, nutrition math, queries
- `prisma/` — schema, migrations, seed script
- `e2e/` — Playwright specs
- `scripts/` — dev-only helper scripts (e.g. `grant-pro.ts`)
- `docs/` — design/planning docs (e.g. the Stripe paywall plan)

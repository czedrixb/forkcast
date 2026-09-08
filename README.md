# Forkcast

AI food tracker and calorie scanner — point your camera at a plate, get an
instant nutrition estimate, and track calories/macros for the day.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Framer Motion · Recharts ·
Supabase (Postgres) via Prisma 7 (`@prisma/adapter-pg`) · Anthropic Claude
(`claude-opus-5`) for the vision scan, with an OpenAI (`gpt-5.5`) fallback and
a deterministic mock fallback below that.

## Getting started

```bash
npm install
cp .env.example .env      # fill in DATABASE_URL/DIRECT_URL (Supabase) and SESSION_SECRET
npx prisma migrate dev    # applies migrations to your Supabase database
npx prisma db seed        # seeds ~60 foods + a demo user with 2 weeks of history
npm run dev               # http://localhost:3200
```

Demo login: `demo@forkcast.app` / `demo1234`.

`ANTHROPIC_API_KEY` and `OPENAI_API_KEY` are both optional — `/scan` prefers
Anthropic when set, falls back to OpenAI when only that key is set, and
otherwise uses a deterministic mock provider (`src/lib/ai/providers/mock.ts`)
so the app and the E2E suite run with zero cost and zero keys.

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

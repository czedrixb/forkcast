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

## Project layout

- `src/app` — routes (App Router), grouped into `(auth)` and `(app)` segments
- `src/components` — UI, feature components, and Recharts wrappers
- `src/actions` — Server Actions (auth, onboarding, logging, tracking)
- `src/lib` — DB client, auth/session, AI adapter, nutrition math, queries
- `prisma/` — schema, migrations, seed script
- `e2e/` — Playwright specs

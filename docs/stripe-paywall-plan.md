# Forkcast Stripe and paywall integration plan

Date: 2026-09-11  
Status: Proposed implementation; portfolio demo only

## Objective

Demonstrate a complete subscription journey using Stripe sandbox/test mode: upgrade, checkout, payment confirmation, scan allowances, renewal, and cancellation. No real charges. Keep manual nutrition tracking usable on Free.

This document is a plan, not an implemented integration. Stripe account creation and sandbox access must be confirmed before integration. Live-payment eligibility is a separate future decision; Philippine businesses are not currently listed for direct Stripe Payments onboarding.

## Pricing and feature access

Use PHP pricing for the initial portfolio demo. Prices are proposed commercial prices, not validated unit economics.

| Plan | Display price | AI scan allowance | Access |
| --- | --- | --- | --- |
| Free | Free | 5 per calendar month | Manual logging, food search, custom foods, daily calories/macros, targets, water, weight, streaks, existing insights |
| Pro monthly | PHP 399/month | 100 per subscription month | Free features plus expanded insights |
| Pro annual | PHP 3,990/year | 100 each month, not 1,200 upfront | Same Pro features; saves PHP 798 compared with 12 monthly payments |

- Create one Stripe product, Forkcast Pro, with monthly and annual recurring test Prices: `php`, amounts `39900` and `399000` in minor units.
- Annual billing is included to demonstrate both intervals. Before any commercial launch, validate costs before offering an annual commitment.
- No rollover, add-on packs, trial subscriptions, or mid-cycle interval changes in the first version.
- The previously discussed USD 7.99/month is an alternative international pricing experiment, not an exchange-rate equivalent. Defer multi-currency billing.
- Retain the current free insight windows: 14-day calories/macros, 60-day weight history, and 28-day streak calendar. Add Pro ranges of 30/90/365 days for calories/macros and 90/365 days for weight. These longer views require implementation; do not advertise them as delivered beforehand.
- Never delete existing diary data when a subscription ends.

## Portfolio mode and AI costs

- Display “Demo checkout — no real charges” on pricing, upgrade prompts, checkout entry, and billing status screens. Identify the resulting entitlement as “Pro · Demo”.
- Use Stripe-hosted Checkout and its hosted customer portal. Never collect card numbers in Forkcast.
- Offer Stripe's documented test card instructions in the demo and tell visitors to use test details only.
- Configure the portfolio deployment to refuse live Stripe keys and live webhook events. Store all secrets server-side.
- Explicitly add `AI_PROVIDER=mock|openai|anthropic`; set `mock` for public portfolio and E2E environments even if real provider keys exist. The existing key-presence selection would otherwise incur real charges.
- Label mock results as sample nutrition estimates. A test subscription must never unlock unlimited paid OpenAI calls.
- Keep any real AI evaluation private and separately budgeted. Record input/output tokens, model, retries, and cost per attempt before evaluating whether PHP 399 for 100 scans is commercially viable.

## Existing integration points

| File | Planned change |
| --- | --- |
| `prisma/schema.prisma` | Add billing state, usage windows, scan reservations, and webhook processing records |
| `src/app/api/scan/route.ts` | Enforce allowance before saving uploads or calling AI; finalize/release reservations |
| `src/components/scan-flow.tsx` | Usage indicator, quota-specific upgrade prompt, preserve completed results |
| `src/lib/ai/analyze.ts` | Explicit provider selection for safe mock demonstrations |
| `src/components/profile-client.tsx` | Plan, billing interval, usage, reset date, manage billing button |
| `src/app/(app)/insights/page.tsx` | Range selector and Pro upgrade prompt |
| `src/lib/queries/insights.ts` | Enforce allowed ranges on the server |
| `.env.example` | Document test Stripe configuration and mock AI selection |
| `e2e/` | Focused billing, quota, and insight tests |

Before implementation, read the relevant local Next.js guides under `node_modules/next/dist/docs/`, as required by AGENTS.md. Inspect any nested instructions before editing their files.

## Proposed application structure

- `src/lib/billing/stripe.ts`: server-only Stripe SDK, pinned API version compatible with the installed SDK, sandbox guard.
- `src/lib/billing/plans.ts`: typed plan definitions and server-side allowed Price IDs.
- `src/lib/billing/entitlements.ts`: derive access from stored verified billing state and paid-through time.
- `src/lib/billing/usage.ts`: allowance windows and transactional reservations.
- `src/lib/billing/sync.ts`: reconcile Stripe subscription/invoice state into the database.
- `src/app/(app)/pricing/page.tsx`: Free/Pro comparison and interval selection.
- `src/app/(app)/billing/success/page.tsx`: confirmation/pending state; never grants access by itself.
- `src/app/api/billing/checkout/route.ts`: authenticated Checkout Session creation.
- `src/app/api/billing/portal/route.ts`: authenticated customer portal session creation.
- `src/app/api/billing/status/route.ts`: read the current user's entitlement and usage for bounded confirmation polling.
- `src/app/api/stripe/webhook/route.ts`: signed Stripe event processing.

Use existing authentication, Prisma, and UI components. Install the server `stripe` package; a client Stripe SDK is unnecessary for a simple redirect to hosted Checkout.

## Database design

Design migrations for these records, retaining Stripe status values separately from the application's Free/Pro decision:

1. **Billing account:** unique user and Stripe customer IDs, environment identifier.
2. **Subscription:** unique Stripe subscription ID, customer/user relation, allowed Price ID, status, billing interval, billing period, paid-through timestamp, cancellation state, usage anchor. Retain historical subscriptions; allow only one current purchase flow/subscription per user.
3. **Usage window:** user, allowance type, start/end timestamps, limit, consumed count, reserved count; unique key for that user/type/window.
4. **Scan usage reservation:** unique user/request key, window relation, pending/consumed/released state, scan result relation, timestamps. Retain enough result information to return a completed duplicate request without calling AI again.
5. **Stripe event receipt:** unique event ID, type, processing state, timestamps, last error. A received event is not considered successfully processed until its database effects commit.

Avoid a client-editable `isPro` flag. Index user/window lookups and enforce uniqueness at the database level.

## Checkout and billing lifecycle

1. Require authentication and resolve the user on the server.
2. Accept only a plan interval enum; map it to an allowlisted Price ID. Never accept a client-supplied amount, customer ID, or arbitrary Price ID.
3. Create/reuse the user's test Stripe customer. Persist a checkout attempt and reuse its idempotency key and pending session across retries/double clicks. Existing subscribers go to billing management.
4. Create Checkout with `mode: subscription`, quantity one, trusted return URLs, and server-set user references in metadata. Start with card payments only to keep the demo lifecycle bounded.
5. Redirect to hosted Checkout. Cancellation returns to pricing without changing access.
6. On return, show “Confirming your demo subscription” until the server reports verified access. Use bounded polling and a refresh action if webhook delivery is delayed.
7. Create customer portal sessions only for the authenticated user's stored customer. Enable payment-method management, invoices, and cancellation at period end. Disable plan/interval switching initially.

### Webhook handling

- Verify `Stripe-Signature` against the untouched raw request body and environment-specific webhook secret. Reject live-mode events in portfolio mode.
- Handle `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, and `customer.subscription.created/updated/deleted`.
- Treat checkout completion as a reconciliation signal. Grant access only after verifying the expected subscription/customer/Price and a paid invoice covering the period.
- Use `invoice.paid` to advance paid-through access. Duplicate invoices/events must never grant another allowance window or extend access twice.
- Do not assume delivery order. Serialize reconciliation per subscription and retrieve current Stripe state where needed so stale events cannot restore canceled access or overwrite newer state.
- Commit event processing and local changes atomically. Return success for already processed events; return a retryable failure for transient processing errors.
- Avoid logging secrets, card details, or complete customer payloads.

### Entitlement rules

| Situation | Result |
| --- | --- |
| No subscription, incomplete checkout, or expired unpaid checkout | Free |
| Confirmed paid Pro subscription within paid-through time | Pro |
| Cancellation scheduled for period end | Pro until paid-through time |
| Failed renewal | No new paid allowance; existing paid access lasts only to its paid-through time |
| Paid period expired, unpaid/canceled subscription | Free; retain diary and existing results |
| Successful payment recovery | Reconcile paid period and restore Pro without duplicate grants |

No payment grace period in the initial demo. Do not implement access solely from `status === active`; check confirmed payment coverage as well.

## Scan accounting

- One successfully analyzed nonempty photo consumes one credit, even if it contains several foods or the user chooses not to log it.
- Portion adjustments, food removal, saving, and reopening completed results consume no extra credits.
- Provider failures and no-food results release the reservation. Rate-limit failed attempts separately so credit refunds cannot allow unlimited AI spending.
- Before uploading to persistent storage or calling AI, atomically reserve one credit only when `consumed + reserved < limit`. A plain count-then-create sequence is insufficient under concurrency.
- Use one active analysis per user plus a configurable short request-rate limit. Do not hold a database transaction open while calling AI.
- Finalize consumption and save results together; reconcile stale pending reservations after timeouts/crashes without double-processing or charging twice.
- Return a structured `SCAN_QUOTA_EXCEEDED` response with remaining count and reset timestamp. Keep infrastructure errors distinct from upgrade prompts.
- Keep requests idempotent through a stable request key; a network retry reuses the same key. An intentional new analysis uses a new key.

### Reset policy

- Free: calendar months in Asia/Manila for this demo. Compute explicit timezone boundaries and store UTC timestamps; avoid depending on the host timezone.
- Monthly Pro: the confirmed subscription billing-period boundaries.
- Annual Pro: monthly windows anchored to the original subscription start, clipped to the paid annual period. Clamp dates to the last day when necessary without drifting the original anchor.
- Create windows lazily on usage/status access; no scheduled reset job is required. Compute them server-side from trusted anchors.
- Upgrade: start a separate paid allowance of 100; retain Free usage so downgrade/re-upgrade does not reset it.
- Downgrade: return to the existing Free allowance for the current calendar month. Annual invoice events must not allocate the entire year's credits at once.
- A scan reserved just before a boundary belongs to its original window even if it finishes afterward.

## UI behavior

- Show remaining scans and an exact reset date on Scan and Profile.
- At zero, offer Upgrade and Add food manually. Preserve any photo preview and already completed results.
- Pricing clearly states 100 scans per month on both paid intervals, including annual checkout.
- Gate only the new long-range insights; existing free charts remain usable.
- Keep cancellation and billing management discoverable from Profile.
- Handle pending payment confirmation, unavailable Stripe configuration, exhausted allowance, and provider failure as distinct states.

## Configuration and setup

Document placeholders for `STRIPE_SECRET_KEY` (test only), `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_ANNUAL`, `APP_URL`, `BILLING_MODE=test`, and `AI_PROVIDER=mock`. Do not commit actual values.

Create test products/Prices and configure the customer portal in the same Stripe sandbox. Forward local events with Stripe CLI to `http://localhost:3200/api/stripe/webhook`; use the listener's signing secret locally. A deployed demo uses its own registered HTTPS webhook endpoint and signing secret.

If Stripe sandbox onboarding is unavailable, keep a clearly labeled local billing simulator behind a development/test-only adapter. Do not present it as a verified Stripe integration or falsely select another business country.

## Implementation sequence

- [ ] Confirm sandbox access and read local framework instructions.
- [ ] Add explicit mock AI mode and portfolio environment guards.
- [ ] Add schema migrations, plan definitions, and entitlement/usage services.
- [ ] Implement authenticated Checkout and customer portal endpoints.
- [ ] Implement signed, idempotent webhook reconciliation.
- [ ] Connect scan reservations and usage responses to the scan flow.
- [ ] Add pricing, confirmation, profile billing controls, and Pro insights.
- [ ] Complete focused automated verification and a real sandbox smoke test.
- [ ] Document setup and attach the required verification report.

## Verification and acceptance criteria

Follow AGENTS.md: after implementation, write/update focused Playwright E2E tests, run them successfully, capture before/after screenshots of affected UI only, and produce an Obsidian report. Use the create-e2e-test skill if available at implementation time.

Suggested tests:

- Free user sees correct pricing/limits and can continue manual logging after exhausting five scans.
- Final available credit succeeds; the next request is blocked before provider invocation. Concurrent requests cannot overspend the final credit.
- Duplicate scan requests, provider failures, and no-food responses preserve correct balances.
- Monthly/annual upgrade journeys show pending confirmation and unlock only after a verified payment event.
- Forged signatures, client price manipulation, cross-user portal access, and live-mode events fail.
- Duplicate and out-of-order webhooks do not grant extra credits or restore expired access.
- Failed renewal, recovery, scheduled cancellation, and period-end downgrade follow the entitlement table.
- Annual monthly refresh, month-end anchors, and Free timezone boundaries work with a controlled clock.
- Longer insights are enforced server-side; Free access and previously saved results survive downgrade.
- Public portfolio and tests always use mock AI regardless of available real keys.

Use isolated test users and a dedicated test database. Deterministic Playwright tests may stub Stripe transport at the server adapter boundary and deliver signed test event fixtures, while exercising real app routes and database behavior. Clearly distinguish these from actual Stripe integration verification.

Separately complete a Playwright-driven hosted Stripe sandbox checkout and customer portal cancellation smoke test with real test credentials and test cards. Verify webhook-driven app state. Use Stripe Billing test clocks/API scenarios for renewal events; do not assume every hosted Checkout scenario supports a test clock. If sandbox access is blocked, report that limitation and do not call the full integration verified.

Capture matched baseline/new screenshots of Scan, Profile, and the existing Insights view. For entirely new pricing/confirmation screens, capture the new state and mark baseline as not applicable rather than fabricating a before view.

Report location, using the actual implementation date:

- `D:\Submit\Obsidian Vault\Reports\<YYYY-MM-DD>-stripe-paywall.md`
- Screenshots: `D:\Submit\Obsidian Vault\Reports\attachments\<YYYY-MM-DD>-stripe-paywall\`
- Include Summary, Test results with relevant output, Screenshot comparison using relative Markdown image links, and Notes. Obtain filesystem approval if writing outside workspace requires it.

No Playwright run or implementation report is required for this Markdown-only planning change; no feature has been implemented yet.

## Deferred commercial-launch decisions

Real payment activation, eligible merchant country/provider selection, production storage, email verification, actual AI unit economics, refunds/disputes policy, taxes/fees, and live monitoring require a separate launch review. Neither sandbox payment success nor mock scan tests establish profitability or live-payment readiness.

## Official references

Checked 2026-09-11; recheck API details against the installed Stripe SDK during implementation.

- [Stripe account setup](https://docs.stripe.com/get-started/account/set-up)
- [Stripe global availability](https://stripe.com/global)
- [Checkout subscription integration](https://docs.stripe.com/billing/subscriptions/build-subscriptions)
- [Subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks)
- [Customer portal integration](https://docs.stripe.com/customer-management/integrate-customer-portal)
- [Billing testing](https://docs.stripe.com/billing/testing)

# Forkcast paywall UX research and recommendation

Date: 2026-09-12  
Scope: UX research only; no product or Stripe implementation changes

## Current state

Forkcast has the entitlement and scan-quota foundation in place, but no dedicated pricing or paywall experience yet.

- A user who exhausts their scan allowance sees an **Upgrade** button in the scan flow.
- That button currently routes to Profile rather than a pricing decision screen.
- Profile shows plan name and remaining scans, but no pricing, billing-management, or purchase controls.
- Proposed demo pricing is PHP 399/month or PHP 3,990/year. Both paid intervals include 100 AI scans per month.

## Recommendation

Build a mobile-first `/pricing` page, with contextual entry points from the exhausted-scan state and Profile. It should frame Pro around the user's current job: continuing to scan and log meals.

### Proposed screen structure

```text
Back

Forkcast Pro
More confidence in every food log.

[ small illustration: meal photo → nutrition insight ]

✓ 100 AI food scans every month
✓ Expanded progress insights
✓ Keep all Free features

[ Monthly ] [ Annual — Best value ]
PHP 399 / month
PHP 3,990 / year · PHP 333/month · Save PHP 798

[ Upgrade to Pro ] → Stripe-hosted Checkout

Demo checkout — no real charges.
Cancel anytime from Profile.
```

### Plan selection

Use two large, selectable plan cards instead of a dense mobile comparison table.

| Plan | Price presentation | Supporting copy |
| --- | --- | --- |
| Monthly | `PHP 399 / month` | Billed monthly |
| Annual | `PHP 3,990 / year` plus `PHP 333/month` | Save PHP 798 · Best value |

Annual can be preselected and labelled **Best value**, but the full annual charge must remain visible alongside its monthly equivalent. Do not use a trial until its economics and abuse protections are deliberately evaluated.

### Entry points and states

| Context | Primary action | Secondary action | Required message |
| --- | --- | --- | --- |
| Scan quota exhausted | Upgrade to continue scanning | Add food manually | Exact scan reset date; preserve selected photo |
| Profile, Free | Explore Pro | — | Current allowance and reset date |
| Profile, Pro | Manage billing | — | Plan, interval, paid-through date, remaining scans |
| Checkout return | Confirming your subscription | Refresh status | Access is pending until verified server-side |
| Stripe not configured | Checkout unavailable | Continue with Free | Do not imply a payment has begun |

## Content guidance

### Recommended headline and benefit copy

- **Forkcast Pro**
- **More confidence in every food log.**
- **Continue scanning meals with 100 AI scans every month.** (quota-exhausted entry point)

Keep the benefit list short, specific, and accurate. At the initial launch, only advertise features that are available:

- 100 AI food scans each month
- Existing Free features remain included
- Expanded insights only after the longer insight ranges are actually implemented

Avoid generic claims such as “unlimited nutrition intelligence” and do not say that the annual plan has 1,200 upfront scans.

### Terms and trust

Show the following directly adjacent to the payment CTA:

- `Demo checkout — no real charges.`
- `Cancel anytime from Profile.`
- The selected recurring billing cadence and total charge.

The public demo must clearly remain test-only. Never collect card details in Forkcast; Stripe-hosted Checkout should collect payment information.

## Visual direction

Follow the existing Forkcast design language:

- Warm cream page background, white/surface cards, lime primary CTA
- Large rounded cards (`28px`) and generous mobile spacing
- One restrained food-photo-to-nutrition illustration or abstract scan visual above the benefits
- Strong contrast for selected plan state; do not rely on color alone
- A persistent or bottom-aligned CTA on small screens once a plan is selected

Avoid an overly dense SaaS comparison matrix on the primary mobile view. If a comparison is needed, place it behind a compact, expandable **Compare Free and Pro** section.

## Stripe-aware product flow

1. User taps the selected plan’s CTA.
2. The server maps a trusted `monthly` or `annual` choice to its allowlisted Stripe Price ID.
3. User is redirected to Stripe-hosted Checkout.
4. Returning users see a dedicated confirmation screen: **Confirming your demo subscription…**
5. The app polls its own billing-status endpoint for a short, bounded period and grants Pro only after webhook-verified payment coverage.
6. Existing subscribers are sent to Stripe’s Customer Portal rather than being allowed to buy a duplicate subscription.
7. Profile exposes **Manage billing**, which opens the Customer Portal for payment methods, invoices, and cancellation.

## Why these choices

- Contextual, soft paywalls preserve access to manual logging and offer an upgrade when the user understands the value of more scans.
- Visible pricing and a simple side-by-side plan selection reduce ambiguity at the purchase decision.
- Clear cancellation and demo terms build trust and avoid manipulative subscription design.
- Hosted Checkout and Customer Portal keep payment collection and recurring-billing management within Stripe’s maintained interfaces.

## Sources

- [Stripe: Design a subscriptions integration](https://docs.stripe.com/billing/subscriptions/design-an-integration?locale=en-GB) — Stripe-hosted Checkout handles payment-method collection and validation, and starts the subscription flow.
- [Stripe: Build a subscriptions integration](https://docs.stripe.com/billing/subscriptions/build-subscriptions?locale=en-GB&ui=embedded-form) — directs customers to the Stripe-hosted Customer Portal for subscription management.
- [Stripe: Limit customers to one subscription](https://docs.stripe.com/payments/checkout/limit-subscriptions?payment-ui=embedded-components) — recommends sending already-subscribed customers to subscription management.
- [Baymard: Plan matrix design examples](https://baymard.com/ecommerce-design-examples/plan-matrix) — supports making plan price and feature comparisons scannable.
- [Baymard: Subscription service UX research](https://baymard.com/blog/new-research-consumables-subscription-services) — supports making pricing visible and easy to find on subscription-plan surfaces.

## Suggested implementation order

1. Create the dedicated pricing page and its two plan selectors.
2. Route the Scan upgrade action to pricing, preserving the manual-log alternative.
3. Add Free/Pro billing controls to Profile.
4. Wire the CTA to Stripe Checkout and add pending-confirmation handling.
5. Wire Profile management to Stripe Customer Portal.
6. Add focused Playwright coverage and the required verification report when implementation begins.

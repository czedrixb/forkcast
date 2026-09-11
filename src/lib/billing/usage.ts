import "server-only";

import type { Prisma, UsageWindow, Subscription } from "@prisma/client";
import { db } from "@/lib/db";
import { getEntitlement, type Entitlement } from "@/lib/billing/entitlements";
import { FREE_SCAN_ALLOWANCE, PRO_SCAN_ALLOWANCE, BILLING_TIMEZONE, STALE_RESERVATION_MS } from "@/lib/billing/plans";

type Tx = Prisma.TransactionClient;
type DbOrTx = typeof db | Tx;

// ---------------------------------------------------------------------------
// Timezone-aware month boundaries
//
// src/lib/queries/today.ts's startOfDay/endOfDay use the host's local time
// (setHours), which is wrong for a billing reset boundary that must be the
// same instant regardless of where the app happens to be deployed. These
// helpers instead derive boundaries in BILLING_TIMEZONE explicitly and
// return UTC Dates, using only Intl (no extra dependency).
// ---------------------------------------------------------------------------

type ZonedParts = { year: number; month: number; day: number };

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}

/** The zone's offset (minutes ahead of UTC) at the given instant. Works for any IANA zone, DST included. */
function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUtc - date.getTime()) / 60_000);
}

/**
 * The UTC instant of local midnight for the given Y-M-D in `timeZone`. Guesses
 * UTC midnight, then corrects using the zone's offset at that guess -- a
 * single correction is exact as long as the zone doesn't shift its offset
 * within the guess/actual gap, which holds for BILLING_TIMEZONE (Asia/Manila,
 * fixed UTC+8, no DST).
 */
function zonedYMDToUtc(year: number, month: number, day: number, timeZone: string): Date {
  const guess = new Date(Date.UTC(year, month - 1, day));
  const offsetMinutes = getTimeZoneOffsetMinutes(guess, timeZone);
  return new Date(guess.getTime() - offsetMinutes * 60_000);
}

/** Last day of `month` (1-12) in `year`. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** [startsAt, endsAt) for the calendar month containing `now`, in `timeZone`. */
export function monthBoundsInZone(now: Date, timeZone: string): { startsAt: Date; endsAt: Date } {
  const { year, month } = getZonedParts(now, timeZone);
  const startsAt = zonedYMDToUtc(year, month, 1, timeZone);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const endsAt = zonedYMDToUtc(nextYear, nextMonth, 1, timeZone);
  return { startsAt, endsAt };
}

/**
 * [startsAt, endsAt) for the monthly slice of an annual Pro subscription that
 * contains `now`, anchored to `anchorAt`'s day-of-month. Short months clamp
 * the effective day to their last day (e.g. an anchor of the 31st gives a
 * Feb slice starting on the 28th/29th) without drifting the anchor itself --
 * the next slice still starts on the 31st where the month allows it. The
 * final slice is clipped to `periodEnd` so the whole year's credits are never
 * allocated up front.
 */
export function monthBoundsFromAnchor(
  anchorAt: Date,
  now: Date,
  periodEnd: Date,
  timeZone: string,
): { startsAt: Date; endsAt: Date } {
  const anchor = getZonedParts(anchorAt, timeZone);

  function sliceStartUtc(n: number): Date {
    const totalMonths = anchor.month - 1 + n;
    const year = anchor.year + Math.floor(totalMonths / 12);
    const month = (((totalMonths % 12) + 12) % 12) + 1;
    const day = Math.min(anchor.day, daysInMonth(year, month));
    return zonedYMDToUtc(year, month, day, timeZone);
  }

  const nowParts = getZonedParts(now, timeZone);
  let n = (nowParts.year - anchor.year) * 12 + (nowParts.month - anchor.month);
  // Slice boundaries are ~1 calendar month apart, so at most one correction
  // in either direction is ever needed to land n on the slice containing `now`.
  while (sliceStartUtc(n).getTime() > now.getTime()) n -= 1;
  while (sliceStartUtc(n + 1).getTime() <= now.getTime()) n += 1;

  const startsAt = sliceStartUtc(n);
  const rawEnd = sliceStartUtc(n + 1);
  const endsAt = rawEnd.getTime() < periodEnd.getTime() ? rawEnd : periodEnd;
  return { startsAt, endsAt };
}

// ---------------------------------------------------------------------------
// Window resolution
// ---------------------------------------------------------------------------

async function boundsForEntitlement(
  entitlement: Entitlement,
  now: Date,
): Promise<{ startsAt: Date; endsAt: Date; allowance: number }> {
  if (entitlement.plan === "free") {
    const bounds = monthBoundsInZone(now, BILLING_TIMEZONE);
    return { ...bounds, allowance: FREE_SCAN_ALLOWANCE };
  }

  const subscription = entitlement.subscription as Subscription;
  const bounds =
    subscription.interval === "monthly"
      ? { startsAt: subscription.currentPeriodStart, endsAt: subscription.currentPeriodEnd }
      : monthBoundsFromAnchor(
          subscription.usageAnchorAt,
          now,
          subscription.paidThroughAt ?? subscription.currentPeriodEnd,
          BILLING_TIMEZONE,
        );
  return { ...bounds, allowance: PRO_SCAN_ALLOWANCE };
}

/**
 * Gets or lazily creates the scan UsageWindow covering `now` for this user's
 * current plan. Free and Pro windows are keyed separately (by `plan`), so an
 * upgrade starts a fresh Pro allowance without touching the still-running
 * Free one, and a downgrade lands back on that same Free window instead of
 * resetting it.
 */
async function resolveCurrentWindow(tx: DbOrTx, userId: string, entitlement: Entitlement, now: Date): Promise<UsageWindow> {
  const { startsAt, endsAt, allowance } = await boundsForEntitlement(entitlement, now);

  return tx.usageWindow.upsert({
    where: { userId_kind_plan_startsAt: { userId, kind: "scan", plan: entitlement.plan, startsAt } },
    create: { userId, kind: "scan", plan: entitlement.plan, startsAt, endsAt, allowance },
    update: {},
  });
}

async function sweepStaleReservations(tx: Tx, userId: string, now: Date): Promise<void> {
  const cutoff = new Date(now.getTime() - STALE_RESERVATION_MS);
  const stale = await tx.scanReservation.findMany({
    where: { userId, state: "pending", createdAt: { lt: cutoff } },
  });
  for (const reservation of stale) {
    await tx.scanReservation.update({
      where: { id: reservation.id },
      data: { state: "released", settledAt: now },
    });
    await tx.$executeRaw`UPDATE "UsageWindow" SET reserved = GREATEST(reserved - 1, 0) WHERE id = ${reservation.windowId}`;
  }
}

// ---------------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------------

export type ReserveResult =
  | { kind: "reserved"; reservationId: string; windowId: string }
  | { kind: "duplicate"; responseJson: string }
  | { kind: "quota"; remaining: number; resetAt: Date }
  | { kind: "in_flight" };

/**
 * Atomically reserves one scan credit for `userId`/`requestKey`, or reports
 * why it can't. Ends before any AI call is made -- callers must not hold this
 * transaction open across `analyzeFoodImage`.
 *
 * The capacity check is a single raw UPDATE guarded by
 * `consumed + reserved < allowance`; a plain read-then-write would race under
 * concurrent requests and could overspend the last credit.
 */
export async function reserveScan(userId: string, requestKey: string): Promise<ReserveResult> {
  const entitlement = await getEntitlement(userId);
  const now = new Date();

  return db.$transaction(async (tx) => {
    await sweepStaleReservations(tx, userId, now);

    // One active analysis per user, regardless of request key.
    const anyPending = await tx.scanReservation.findFirst({ where: { userId, state: "pending" } });
    if (anyPending) return { kind: "in_flight" };

    const existing = await tx.scanReservation.findUnique({
      where: { userId_requestKey: { userId, requestKey } },
    });
    if (existing?.state === "consumed") {
      return { kind: "duplicate", responseJson: existing.responseJson ?? "{}" };
    }

    const window = await resolveCurrentWindow(tx, userId, entitlement, now);

    const claimed = await tx.$executeRaw`
      UPDATE "UsageWindow" SET reserved = reserved + 1
      WHERE id = ${window.id} AND consumed + reserved < allowance
    `;
    if (claimed === 0) {
      const remaining = Math.max(window.allowance - window.consumed - window.reserved, 0);
      return { kind: "quota", remaining, resetAt: window.endsAt };
    }

    // A previously released reservation for this exact key is reused rather
    // than re-created -- (userId, requestKey) is unique, so a retry that
    // reuses the original key must land on the same row.
    if (existing?.state === "released") {
      await tx.scanReservation.update({
        where: { id: existing.id },
        data: { state: "pending", windowId: window.id, settledAt: null, responseJson: null },
      });
      return { kind: "reserved", reservationId: existing.id, windowId: window.id };
    }

    const reservation = await tx.scanReservation.create({
      data: { userId, requestKey, windowId: window.id, state: "pending" },
    });
    return { kind: "reserved", reservationId: reservation.id, windowId: window.id };
  });
}

/** Marks a reservation consumed and stores the exact response for duplicate replay. */
export async function finalizeScan(reservationId: string, responseJson: string, scanResultId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const reservation = await tx.scanReservation.update({
      where: { id: reservationId },
      data: { state: "consumed", responseJson, scanResultId, settledAt: new Date() },
    });
    await tx.$executeRaw`UPDATE "UsageWindow" SET consumed = consumed + 1, reserved = GREATEST(reserved - 1, 0) WHERE id = ${reservation.windowId}`;
  });
}

/** Releases a reservation without consuming a credit -- provider failures and no-food results. */
export async function releaseScan(reservationId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const reservation = await tx.scanReservation.update({
      where: { id: reservationId },
      data: { state: "released", settledAt: new Date() },
    });
    await tx.$executeRaw`UPDATE "UsageWindow" SET reserved = GREATEST(reserved - 1, 0) WHERE id = ${reservation.windowId}`;
  });
}

// ---------------------------------------------------------------------------
// Read-only summary for UI
// ---------------------------------------------------------------------------

export type UsageSummary = {
  plan: "free" | "pro";
  used: number;
  allowance: number;
  remaining: number;
  resetAt: Date;
};

/** Creates the current window lazily if needed (Prisma's upsert compiles to an atomic native upsert on Postgres, so concurrent reads can't double-create it). */
export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const entitlement = await getEntitlement(userId);
  const window = await resolveCurrentWindow(db, userId, entitlement, new Date());
  const used = window.consumed + window.reserved;
  return {
    plan: entitlement.plan,
    used,
    allowance: window.allowance,
    remaining: Math.max(window.allowance - used, 0),
    resetAt: window.endsAt,
  };
}

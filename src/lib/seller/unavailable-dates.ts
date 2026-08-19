import { prisma } from "@/lib/prisma";
import {
  dateKeyFromBookingWhen,
  dateKeyToUtcDate,
  isDateKey,
  toDateKey,
  utcDateToDateKey,
} from "@/lib/calendar-date";
import type { SpecialRequestStatus } from "@/generated/prisma/client";

const OCCUPYING_STATUSES: SpecialRequestStatus[] = [
  "RECEIVED",
  "ACCEPTED",
  "IN_PROGRESS",
  "DELIVERED",
];

export async function findCreatorIdForSeller(userId: string, slug: string) {
  const byUser = await prisma.creatorUser.findFirst({
    where: { userId },
    select: { id: true },
  });
  if (byUser) return byUser.id;

  return resolveCreatorIdForPublicSlug(slug);
}

/** Resolve the creator record fans/sellers share for a public profile slug. */
export async function resolveCreatorIdForPublicSlug(slug: string) {
  const normalized = slug.trim();
  if (!normalized) return null;

  // Prefer the creator linked to the onboarded profile — same path sellers use when blocking dates.
  const profile = await prisma.userProfile.findFirst({
    where: { slug: { equals: normalized, mode: "insensitive" } },
    select: { userId: true },
  });
  if (profile?.userId) {
    const linked = await prisma.creatorUser.findFirst({
      where: { userId: profile.userId },
      select: { id: true },
    });
    if (linked) return linked.id;
  }

  const creator = await prisma.creatorUser.findFirst({
    where: {
      OR: [
        { slug: { equals: normalized, mode: "insensitive" } },
        { handle: { equals: `@${normalized}`, mode: "insensitive" } },
        { handle: { equals: normalized, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  return creator?.id ?? null;
}

async function findCreatorIdBySlug(slug: string) {
  return resolveCreatorIdForPublicSlug(slug);
}

function bookingDateKey(booking: {
  deliverBy: Date | null;
  requestedForAt: Date | null;
  createdAt: Date;
}) {
  return toDateKey(booking.deliverBy ?? booking.requestedForAt ?? booking.createdAt);
}

export async function occupyingDateKeysForCreator(creatorId: string) {
  const bookings = await prisma.specialRequest.findMany({
    where: { creatorId, status: { in: OCCUPYING_STATUSES } },
    select: { deliverBy: true, requestedForAt: true, createdAt: true },
  });
  return new Set(bookings.map(bookingDateKey));
}

export async function listUnavailableDateKeys(creatorId: string) {
  const rows = await prisma.creatorUnavailableDate.findMany({
    where: { creatorId },
    select: { date: true },
    orderBy: { date: "asc" },
  });
  return rows.map((row) => utcDateToDateKey(row.date));
}

export async function listUnavailableDateKeysBySlug(slug: string) {
  const creatorId = await findCreatorIdBySlug(slug);
  if (!creatorId) return [];
  return listUnavailableDateKeys(creatorId);
}

export async function isCreatorDateUnavailable(creatorId: string, dateKey: string) {
  if (!isDateKey(dateKey)) return false;
  const row = await prisma.creatorUnavailableDate.findUnique({
    where: { creatorId_date: { creatorId, date: dateKeyToUtcDate(dateKey) } },
    select: { id: true },
  });
  return Boolean(row);
}

export function resolveBookingDateKey(input: {
  when?: string | null;
  deliverBy?: Date | null;
  requestedForAt?: Date | null;
}) {
  return (
    dateKeyFromBookingWhen(input.when) ??
    (input.requestedForAt ? toDateKey(input.requestedForAt) : null) ??
    (input.deliverBy ? toDateKey(input.deliverBy) : null)
  );
}

export async function isSlugDateUnavailable(slug: string, dateKey: string) {
  const creatorId = await findCreatorIdBySlug(slug);
  if (!creatorId) return false;
  return isCreatorDateUnavailable(creatorId, dateKey);
}

function uniqueValidKeys(values: string[]) {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const key = value.trim();
    if (!isDateKey(key) || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  return keys;
}

export async function setCreatorUnavailableDates(
  creatorId: string,
  keys: string[],
  unavailable: boolean,
) {
  const dates = uniqueValidKeys(keys);
  if (dates.length === 0) {
    return {
      dates: await listUnavailableDateKeys(creatorId),
      updated: [] as string[],
      skipped: [] as string[],
    };
  }

  if (!unavailable) {
    await prisma.creatorUnavailableDate.deleteMany({
      where: {
        creatorId,
        date: { in: dates.map(dateKeyToUtcDate) },
      },
    });
    return {
      dates: await listUnavailableDateKeys(creatorId),
      updated: dates,
      skipped: [] as string[],
    };
  }

  const occupied = await occupyingDateKeysForCreator(creatorId);
  const skipped = dates.filter((key) => occupied.has(key));
  const blocked = skipped.length > 0 ? new Set(skipped) : null;
  const toCreate = blocked ? dates.filter((key) => !blocked.has(key)) : dates;

  if (toCreate.length > 0) {
    await prisma.creatorUnavailableDate.createMany({
      data: toCreate.map((key) => ({
        creatorId,
        date: dateKeyToUtcDate(key),
      })),
      skipDuplicates: true,
    });
  }

  return {
    dates: await listUnavailableDateKeys(creatorId),
    updated: toCreate,
    skipped,
  };
}

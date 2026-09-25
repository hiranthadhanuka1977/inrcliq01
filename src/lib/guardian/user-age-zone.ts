import { AgeZone } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  type AgeZoneCode,
  AGE_ZONE_DESCRIPTIONS,
  AGE_ZONE_ICON_BADGE_KEYS,
  AGE_ZONE_LABELS,
  resolveAgeZoneFromDateOfBirth,
} from "@/lib/utils/age-zone";

export type AgeZoneBadge = {
  zone: AgeZoneCode;
  label: string;
  /** Stable key used to select the zone icon badge in the UI. */
  iconBadgeKey: string;
  description: string | null;
  minAgeInclusive: number;
  maxAgeExclusive: number | null;
};

const ZONE_TO_PRISMA: Record<AgeZoneCode, AgeZone> = {
  KIDS: AgeZone.KIDS,
  TEENS: AgeZone.TEENS,
  MATURE_TEENS: AgeZone.MATURE_TEENS,
  ADULT: AgeZone.ADULT,
};

export function ageZoneToPrisma(zone: AgeZoneCode | null): AgeZone | null {
  if (!zone) return null;
  return ZONE_TO_PRISMA[zone];
}

/** Prisma write payload when creating/updating a user with a known DOB. */
export function ageZoneWriteData(
  dateOfBirth: Date | null | undefined,
): { ageZone: AgeZone | null } {
  return {
    ageZone: ageZoneToPrisma(resolveAgeZoneFromDateOfBirth(dateOfBirth ?? null)),
  };
}

function toBadge(row: {
  zone: AgeZone;
  label: string;
  iconBadgeKey: string;
  description: string | null;
  minAgeInclusive: number;
  maxAgeExclusive: number | null;
}): AgeZoneBadge {
  return {
    zone: row.zone as AgeZoneCode,
    label: row.label,
    iconBadgeKey: row.iconBadgeKey,
    description: row.description,
    minAgeInclusive: row.minAgeInclusive,
    maxAgeExclusive: row.maxAgeExclusive,
  };
}

function fallbackBadge(zone: AgeZoneCode): AgeZoneBadge {
  return {
    zone,
    label: AGE_ZONE_LABELS[zone],
    iconBadgeKey: AGE_ZONE_ICON_BADGE_KEYS[zone],
    description: AGE_ZONE_DESCRIPTIONS[zone],
    minAgeInclusive: zone === "KIDS" ? 0 : zone === "TEENS" ? 13 : zone === "MATURE_TEENS" ? 16 : 18,
    maxAgeExclusive: zone === "KIDS" ? 13 : zone === "TEENS" ? 16 : zone === "MATURE_TEENS" ? 18 : null,
  };
}

/** Load all zone definitions (including icon badge keys) from the database. */
export async function listAgeZoneDefinitions(): Promise<AgeZoneBadge[]> {
  try {
    if (typeof prisma.ageZoneDefinition?.findMany !== "function") {
      return (Object.keys(AGE_ZONE_ICON_BADGE_KEYS) as AgeZoneCode[]).map(fallbackBadge);
    }
    const rows = await prisma.ageZoneDefinition.findMany({
      orderBy: { sortOrder: "asc" },
    });
    if (rows.length === 0) {
      return (Object.keys(AGE_ZONE_ICON_BADGE_KEYS) as AgeZoneCode[]).map(fallbackBadge);
    }
    return rows.map(toBadge);
  } catch {
    return (Object.keys(AGE_ZONE_ICON_BADGE_KEYS) as AgeZoneCode[]).map(fallbackBadge);
  }
}

/** Resolve the icon badge key (and label) for a zone code. */
export async function getAgeZoneBadge(zone: AgeZoneCode | null | undefined): Promise<AgeZoneBadge | null> {
  if (!zone) return null;
  try {
    if (typeof prisma.ageZoneDefinition?.findUnique === "function") {
      const row = await prisma.ageZoneDefinition.findUnique({
        where: { zone: ZONE_TO_PRISMA[zone] },
      });
      if (row) return toBadge(row);
    }
  } catch {
    // Fall through to static defaults.
  }
  return fallbackBadge(zone);
}

/**
 * Current zone for a user from date of birth (source of truth), plus icon badge metadata.
 * Optionally refreshes the cached `User.ageZone` column when it has drifted.
 */
export async function getUserCurrentAgeZone(
  userId: string,
  options?: { syncCache?: boolean },
): Promise<AgeZoneCode | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dateOfBirth: true, ageZone: true },
  });
  if (!user) return null;

  const current = resolveAgeZoneFromDateOfBirth(user.dateOfBirth);
  if (options?.syncCache !== false && current && user.ageZone !== current) {
    await prisma.user.update({
      where: { id: userId },
      data: { ageZone: ageZoneToPrisma(current) },
    });
  }
  return current;
}

/** Current zone + icon badge for a user (from DOB). */
export async function getUserAgeZoneBadge(userId: string): Promise<AgeZoneBadge | null> {
  const zone = await getUserCurrentAgeZone(userId);
  return getAgeZoneBadge(zone);
}

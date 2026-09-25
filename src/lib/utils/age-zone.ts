/**
 * INRCLIQ age zones (default bands; upper bound exclusive where marked):
 * - Kids Zone:          ages 1–<13
 * - Teens Zone:         ages 13–<16
 * - Mature Teens Zone:  ages 16–<18
 * - Adult profile:      ages 18+
 *
 * Date of birth is the source of truth; `User.ageZone` is a queryable cache.
 */

export type AgeZoneCode = "KIDS" | "TEENS" | "MATURE_TEENS" | "ADULT";

export const AGE_ZONE_LABELS: Record<AgeZoneCode, string> = {
  KIDS: "Kids Zone",
  TEENS: "Teens Zone",
  MATURE_TEENS: "Mature Teens Zone",
  ADULT: "Adult profile",
};

/** Default icon badge keys (kept in sync with AgeZoneDefinition.iconBadgeKey seed). */
export const AGE_ZONE_ICON_BADGE_KEYS: Record<AgeZoneCode, string> = {
  KIDS: "age-zone-kids",
  TEENS: "age-zone-teens",
  MATURE_TEENS: "age-zone-mature-teens",
  ADULT: "age-zone-adult",
};

/** Default zone descriptions shown on badge hover (synced with AgeZoneDefinition.description). */
export const AGE_ZONE_DESCRIPTIONS: Record<AgeZoneCode, string> = {
  KIDS:
    "Kids Zone is for ages under 13. It uses the highest protection defaults for younger linked accounts.",
  TEENS:
    "Teens Zone is for ages 13 through 15. It keeps strong safety defaults while allowing guided teen activity.",
  MATURE_TEENS:
    "Mature Teens Zone is for ages 16 through 17. It adds more flexibility with tighter rules for adult contact.",
  ADULT:
    "Adult profile is for ages 18 and over. Standard adult messaging and content rules apply.",
};

export function ageZoneDescription(zone: AgeZoneCode | null | undefined): string | null {
  if (!zone) return null;
  return AGE_ZONE_DESCRIPTIONS[zone];
}

/** Inclusive lower / exclusive upper age bounds (years). */
export const AGE_ZONE_BOUNDS: ReadonlyArray<{
  zone: AgeZoneCode;
  minAgeInclusive: number;
  maxAgeExclusive: number | null;
}> = [
  { zone: "KIDS", minAgeInclusive: 0, maxAgeExclusive: 13 },
  { zone: "TEENS", minAgeInclusive: 13, maxAgeExclusive: 16 },
  { zone: "MATURE_TEENS", minAgeInclusive: 16, maxAgeExclusive: 18 },
  { zone: "ADULT", minAgeInclusive: 18, maxAgeExclusive: null },
];

export function ageInYears(dateOfBirth: Date, asOf: Date = new Date()): number {
  let age = asOf.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = asOf.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return age;
}

/** Resolve the current age zone from a date of birth. Returns null when DOB is missing/invalid. */
export function resolveAgeZoneFromDateOfBirth(
  dateOfBirth: Date | null | undefined,
  asOf: Date = new Date(),
): AgeZoneCode | null {
  if (!dateOfBirth || Number.isNaN(dateOfBirth.getTime())) return null;
  const age = ageInYears(dateOfBirth, asOf);
  if (age < 0) return null;

  for (const band of AGE_ZONE_BOUNDS) {
    if (age < band.minAgeInclusive) continue;
    if (band.maxAgeExclusive == null || age < band.maxAgeExclusive) {
      return band.zone;
    }
  }
  return "ADULT";
}

export function ageZoneLabel(zone: AgeZoneCode | null | undefined): string {
  if (!zone) return "Unknown";
  return AGE_ZONE_LABELS[zone];
}

/** True for Kids / Teens / Mature Teens (under 18). */
export function isMinorAgeZone(zone: AgeZoneCode | null | undefined): boolean {
  return zone === "KIDS" || zone === "TEENS" || zone === "MATURE_TEENS";
}

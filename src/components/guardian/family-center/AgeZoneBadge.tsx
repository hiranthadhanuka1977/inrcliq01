"use client";

import {
  AGE_ZONE_DESCRIPTIONS,
  AGE_ZONE_ICON_BADGE_KEYS,
  type AgeZoneCode,
} from "@/lib/utils/age-zone";

const AGE_ZONE_ICON_SRC: Record<string, string> = {
  [AGE_ZONE_ICON_BADGE_KEYS.KIDS]: "/iconography/age-zone-kids.svg",
  [AGE_ZONE_ICON_BADGE_KEYS.TEENS]: "/iconography/age-zone-teens.svg",
  [AGE_ZONE_ICON_BADGE_KEYS.MATURE_TEENS]: "/iconography/age-zone-mature-teens.svg",
  [AGE_ZONE_ICON_BADGE_KEYS.ADULT]: "/iconography/age-zone-adult.svg",
};

export function getAgeZoneIconSrc(iconBadgeKey: string | null | undefined) {
  if (!iconBadgeKey) return null;
  return AGE_ZONE_ICON_SRC[iconBadgeKey] ?? null;
}

export function AgeZoneBadgeIcon({
  iconBadgeKey,
  zone,
  className = "",
}: {
  iconBadgeKey: string | null | undefined;
  zone?: AgeZoneCode | null;
  className?: string;
}) {
  const key = iconBadgeKey || (zone ? AGE_ZONE_ICON_BADGE_KEYS[zone] : null);
  const src = getAgeZoneIconSrc(key);
  if (!src || !key) return null;

  return (
    <span
      className={`age-zone-badge-icon age-zone-badge-icon--${key}${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={20} height={20} decoding="async" />
    </span>
  );
}

export default function AgeZoneBadge({
  iconBadgeKey,
  zone,
  zoneLabel,
  age,
  description,
}: {
  iconBadgeKey: string;
  zone?: AgeZoneCode | null;
  zoneLabel: string;
  age: number | null;
  /** Age-zone description from AgeZoneDefinition (or fallback). */
  description: string | null;
}) {
  const ageLine = age != null ? `${age} years old` : null;
  const zoneDescription =
    description?.trim() ||
    (zone ? AGE_ZONE_DESCRIPTIONS[zone] : null) ||
    `${zoneLabel} is this account’s current age band.`;

  return (
    <span className="age-zone-badge">
      <span
        className="age-zone-badge__trigger"
        tabIndex={0}
        aria-label={`${zoneLabel}. ${zoneDescription}${ageLine ? ` Current age: ${ageLine}.` : ""}`}
      >
        <AgeZoneBadgeIcon iconBadgeKey={iconBadgeKey} zone={zone} />
      </span>
      <span className="age-zone-badge__tooltip" role="tooltip">
        <span className="age-zone-badge__tooltip-zone">{zoneLabel}</span>
        <span className="age-zone-badge__tooltip-intro">{zoneDescription}</span>
        {ageLine ? (
          <span className="age-zone-badge__tooltip-age">
            <span className="age-zone-badge__tooltip-age-label">Age</span>
            {ageLine}
          </span>
        ) : null}
      </span>
    </span>
  );
}

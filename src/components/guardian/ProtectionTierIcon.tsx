import type { ProtectionTier } from "@/lib/guardian/constants";

const PROTECTION_TIER_ICON_SRC = {
  strict: "/iconography/protection-tier-strict.svg",
  standard: "/iconography/protection-tier-standard.svg",
  relaxed: "/iconography/protection-tier-relaxed.svg",
  unset: "/iconography/protection-tier-unset.svg",
} as const;

export function getProtectionTierIconSrc(tier: ProtectionTier | null) {
  return PROTECTION_TIER_ICON_SRC[tier ?? "unset"];
}

export default function ProtectionTierIcon({
  tier,
  className = "",
}: {
  tier: ProtectionTier | null;
  className?: string;
}) {
  const value = tier ?? "unset";
  const src = getProtectionTierIconSrc(tier);

  return (
    <span
      className={`protection-tier-icon protection-tier-icon--${value}${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      <img src={src} alt="" width={24} height={24} decoding="async" />
    </span>
  );
}

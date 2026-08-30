import type { ProtectionTier } from "@/lib/guardian/constants";

export default function ProtectionTierIcon({
  tier,
  className = "",
}: {
  tier: ProtectionTier | null;
  className?: string;
}) {
  const value = tier ?? "unset";

  return (
    <span
      className={`protection-tier-icon protection-tier-icon--${value}${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      {value === "standard" ? (
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ) : value === "strict" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      ) : value === "relaxed" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polygon points="12 7 13.5 10.5 17 11 14.5 13.5 15 17 12 15 9 17 9.5 13.5 7 11 10.5 7 7" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )}
    </span>
  );
}

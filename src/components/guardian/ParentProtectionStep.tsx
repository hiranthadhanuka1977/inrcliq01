"use client";

import { useState } from "react";
import type { GuardianChildContext } from "@/lib/auth/guardian-flow";
import {
  PROTECTION_TIER_LABELS,
  type ProtectionTier,
} from "@/lib/guardian/constants";
import ProtectionTierIcon from "@/components/guardian/ProtectionTierIcon";

export function ParentProtectionStep({
  child,
  onApprove,
  isSubmitting,
  error,
}: {
  child: GuardianChildContext;
  onApprove: (tier: ProtectionTier) => void;
  isSubmitting?: boolean;
  error?: string;
}) {
  const firstName = child.firstName;
  const childAge = child.age ?? 14;
  const [tier, setTier] = useState<ProtectionTier>("standard");
  const tierOptions: ProtectionTier[] = ["strict", "standard", "relaxed"];

  function selectByArrow(current: ProtectionTier, direction: "next" | "prev") {
    const currentIndex = tierOptions.indexOf(current);
    const nextIndex =
      direction === "next"
        ? (currentIndex + 1) % tierOptions.length
        : (currentIndex - 1 + tierOptions.length) % tierOptions.length;
    setTier(tierOptions[nextIndex]);
  }

  return (
    <div className="protection-setup">
      <div className="protection-setup__recommendation" role="note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <p>
          {firstName} · Age {childAge}, Based on {firstName}&apos;s age we recommend Standard protection. You can
          change this anytime.
        </p>
      </div>

      <h1 id="par-protection-title" className="parent-signup__title protection-setup__title text-center mt-8">
        Choose {firstName}&apos;s protection level
      </h1>
      <p className="subtitle mt-2 text-center">You can change this anytime from your dashboard.</p>

      <div className="protection-tiers mt-8" role="radiogroup" aria-labelledby="par-protection-title">
        {tierOptions.map((value) => (
          <button
            key={value}
            type="button"
            className={`protection-tier${tier === value ? " is-selected" : ""}`}
            role="radio"
            aria-checked={tier === value}
            aria-label={`${PROTECTION_TIER_LABELS[value]} protection`}
            onClick={() => setTier(value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                selectByArrow(value, "next");
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                selectByArrow(value, "prev");
              }
            }}
          >
            <span className={`protection-tier__icon protection-tier__icon--${value}`} aria-hidden="true">
              <ProtectionTierIcon tier={value} />
            </span>
            <span className="protection-tier__heading">
              <strong className="protection-tier__name">{PROTECTION_TIER_LABELS[value]}</strong>
              {value === "standard" ? <span className="protection-tier__badge">Recommended</span> : null}
            </span>
            <span className="protection-tier__tagline">
              {value === "strict"
                ? "Recommended for kids & younger teens."
                : value === "standard"
                  ? "Most parents pick this"
                  : "For older, mature teens"}
            </span>
            <ul className="protection-tier__features">
              {value === "strict" ? (
                <>
                  <li>Curated creators only</li>
                  <li>No DMs</li>
                  <li>All comments hidden</li>
                  <li>Screen time: 1 h/day</li>
                </>
              ) : value === "standard" ? (
                <>
                  <li>Verified creators</li>
                  <li>DMs from approved only</li>
                  <li>Comment filter on</li>
                  <li>Screen time: 2 h/day</li>
                </>
              ) : (
                <>
                  <li>All creators</li>
                  <li>DMs allowed</li>
                  <li>Standard moderation</li>
                  <li>No screen time limit</li>
                </>
              )}
            </ul>
          </button>
        ))}
      </div>

      {error ? (
        <p className="field-error mt-4 text-center" role="alert">
          {error}
        </p>
      ) : null}

      <div className="protection-setup__actions">
        <button
          type="button"
          className="btn btn--primary protection-setup__approve"
          onClick={() => onApprove(tier)}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Approving…" : `Approve and activate ${firstName}'s account`}
        </button>
      </div>
    </div>
  );
}

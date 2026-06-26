"use client";

import { useState } from "react";
import type { GuardianChildContext } from "@/lib/auth/guardian-flow";
import {
  PROTECTION_TIER_LABELS,
  type ProtectionTier,
} from "@/lib/guardian/constants";

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

      <h1 className="parent-signup__title protection-setup__title text-center mt-8">
        Choose {firstName}&apos;s protection level
      </h1>
      <p className="subtitle mt-2 text-center">You can change this anytime from your dashboard.</p>

      <div className="protection-tiers mt-8" role="radiogroup" aria-labelledby="par-protection-title">
        {(["strict", "standard", "relaxed"] as ProtectionTier[]).map((value) => (
          <button
            key={value}
            type="button"
            className={`protection-tier${tier === value ? " is-selected" : ""}`}
            role="radio"
            aria-checked={tier === value}
            onClick={() => setTier(value)}
          >
            <span className={`protection-tier__icon protection-tier__icon--${value}`} aria-hidden="true">
              {value === "standard" ? (
                <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  {value === "relaxed" ? (
                    <polygon points="12 7 13.5 10.5 17 11 14.5 13.5 15 17 12 15 9 17 9.5 13.5 7 11 10.5 7 7" />
                  ) : (
                    <polyline points="9 12 11 14 15 10" />
                  )}
                </svg>
              )}
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

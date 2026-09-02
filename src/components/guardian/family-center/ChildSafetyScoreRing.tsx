"use client";

import { useId } from "react";
import type { ControlHealthItem } from "@/lib/guardian/family-center-static";
import { safetyScoreToneLabel, type SafetyScoreTone } from "@/lib/guardian/safety-score";

const RADIUS = 15;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type ChildSafetyScoreRingProps = {
  score: number;
  tone: SafetyScoreTone;
  childName: string;
  protectionLabel: string;
  controlItems: ControlHealthItem[];
};

export function ChildSafetyScoreRing({
  score,
  tone,
  childName,
  protectionLabel,
  controlItems,
}: ChildSafetyScoreRingProps) {
  const popoverId = useId();
  const clampedScore = Math.max(0, Math.min(100, score));
  const dashOffset = CIRCUMFERENCE * (1 - clampedScore / 100);
  const toneLabel = safetyScoreToneLabel(tone);
  const triggerLabel = `Safety and security score for ${childName}: ${clampedScore} out of 100. ${toneLabel}.`;

  return (
    <div className="family-center__safety-score-wrap">
      <button
        type="button"
        className={`family-center__safety-score family-center__safety-score--${tone}`}
        aria-label={triggerLabel}
        aria-describedby={popoverId}
      >
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <circle
            className="family-center__safety-score-track"
            cx="18"
            cy="18"
            r={RADIUS}
            fill="none"
            strokeWidth="3"
          />
          <circle
            className="family-center__safety-score-progress"
            cx="18"
            cy="18"
            r={RADIUS}
            fill="none"
            strokeWidth="3"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 18 18)"
          />
        </svg>
        <span className="family-center__safety-score-value" aria-hidden="true">
          {clampedScore}
        </span>
      </button>

      <div
        id={popoverId}
        className="family-center__safety-score-popover"
        role="tooltip"
      >
        <div className="family-center__safety-score-popover-head">
          <strong>Safety &amp; security score</strong>
          <span className={`family-center__safety-score-popover-badge family-center__safety-score-popover-badge--${tone}`}>
            {toneLabel}
          </span>
        </div>
        <p className="family-center__safety-score-popover-score">
          <span className="family-center__safety-score-popover-value">{clampedScore}</span>
          <span className="family-center__safety-score-popover-max">/ 100</span>
        </p>
        <p className="family-center__safety-score-popover-copy">
          Reflects {childName}&apos;s {protectionLabel.toLowerCase()} protection settings and active
          control health.
        </p>
        <ul className="family-center__safety-score-popover-list">
          {controlItems.map((item) => (
            <li
              key={item.label}
              className={`family-center__safety-score-popover-item family-center__safety-score-popover-item--${item.status}`}
            >
              <span className="family-center__safety-score-popover-item-label">{item.label}</span>
              <span className="family-center__safety-score-popover-item-value">{item.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

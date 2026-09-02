import type { SafetyScoreTone } from "@/lib/guardian/safety-score";

const RADIUS = 15;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type ChildSafetyScoreRingProps = {
  score: number;
  tone: SafetyScoreTone;
  childName: string;
};

export function ChildSafetyScoreRing({ score, tone, childName }: ChildSafetyScoreRingProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const dashOffset = CIRCUMFERENCE * (1 - clampedScore / 100);
  const label = `Safety and security score for ${childName}: ${clampedScore} out of 100`;

  return (
    <div
      className={`family-center__safety-score family-center__safety-score--${tone}`}
      role="img"
      aria-label={label}
      title={label}
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
    </div>
  );
}

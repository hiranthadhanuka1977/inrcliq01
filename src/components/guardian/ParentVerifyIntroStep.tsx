"use client";

export function ParentVerifyIntroStep({
  onBack,
  onStart,
  isSubmitting,
}: {
  onBack: () => void;
  onStart: () => void;
  isSubmitting?: boolean;
}) {
  return (
    <>
      <button type="button" className="parent-signup__back link-btn" onClick={onBack}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      <h1 className="parent-signup__title">Eligibility verification</h1>
      <p className="subtitle mt-2">
        Child safety regulations require us to verify that you meet the minimum requirements.
      </p>

      <p className="parent-verify__secure-note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
        Data processed securely · Not stored after verification
      </p>

      <div className="parent-verify__card mt-8">
        <span className="parent-verify__card-icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M8 18V8h10M40 18V8H30M8 30v10h10M40 30v10H30" />
            <circle cx="24" cy="22" r="6" />
            <path d="M16 36c2-3 5-4.5 8-4.5s6 1.5 8 4.5" />
          </svg>
        </span>
        <div className="parent-verify__card-body">
          <h2 className="parent-verify__card-title">ID + Face Scan</h2>
          <p className="parent-verify__card-text">
            Scan your ID and take a selfie; we&apos;ll securely match them and confirm your eligibility to set up
            parental supervision in line with InrCliq&apos;s eSafety guidelines.
          </p>
        </div>
      </div>

      <button type="button" className="btn btn--primary mt-8" onClick={onStart} disabled={isSubmitting}>
        {isSubmitting ? "Starting…" : "Start verification"}
      </button>

      <p className="parent-verify__encrypt-note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Your information is encrypted end-to-end
      </p>
    </>
  );
}

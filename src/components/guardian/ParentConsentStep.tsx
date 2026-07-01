"use client";

import Link from "next/link";
import type { GuardianChildContext } from "@/lib/auth/guardian-flow";

export function ParentConsentStep({
  child,
  onApprove,
  onDecline,
  isSubmitting,
}: {
  child: GuardianChildContext;
  onApprove: () => void;
  onDecline: () => void;
  isSubmitting?: boolean;
}) {
  const firstName = child.firstName;

  return (
    <section className="screen page-centered">
      <div className="page-centered__inner parent-consent">
        <header className="parent-consent__header">
          <h1>{firstName} wants to join InrCliq</h1>
          <p className="subtitle mt-2">
            We need a quick approval from you before they can access the platform.
          </p>
        </header>

        <section className="parent-consent__section" aria-labelledby="par-about-heading">
          <div className="parent-consent__section-head">
            <h2 id="par-about-heading">What is InrCliq?</h2>
            <Link href="/" className="link-btn parent-consent__explore-link">
              Explore more about InrCliq
            </Link>
          </div>
          <div className="parent-consent__features">
            <article className="parent-consent__feature">
              <span className="parent-consent__feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </span>
              <p>
                A platform for family, friends, artist and creators to connect together and be informed of what
                they are up to and more.
              </p>
            </article>
            <article className="parent-consent__feature">
              <span className="parent-consent__feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
              <p>Built with child safety as a priority parental approval is required for users under 16</p>
            </article>
            <article className="parent-consent__feature">
              <span className="parent-consent__feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <p>Your child&apos;s data is protected under COPPA and GDPR-K regulations</p>
            </article>
          </div>
        </section>

        <section className="parent-consent__section" aria-labelledby="par-steps-heading">
          <h2 id="par-steps-heading">Here&apos;s what we&apos;ll ask you to do</h2>
          <ol className="parent-consent__steps">
            <li className="parent-consent__step">
              <span className="parent-consent__step-num" aria-hidden="true">1</span>
              <div className="parent-consent__step-body">
                <strong>Create a free InrCliq parent account</strong>
                <span className="parent-consent__step-meta">~ 2 minutes</span>
              </div>
            </li>
            <li className="parent-consent__step">
              <span className="parent-consent__step-num" aria-hidden="true">2</span>
              <div className="parent-consent__step-body">
                <strong>Verify your identity</strong>
                <span className="parent-consent__step-meta">~ 3 minutes</span>
              </div>
            </li>
            <li className="parent-consent__step">
              <span className="parent-consent__step-num" aria-hidden="true">3</span>
              <div className="parent-consent__step-body">
                <strong>Choose how much protection {firstName} gets</strong>
                <span className="parent-consent__step-meta">You stay in control, always</span>
              </div>
            </li>
            <li className="parent-consent__step">
              <span className="parent-consent__step-num" aria-hidden="true">4</span>
              <div className="parent-consent__step-body">
                <strong>Approve or decline, your choice always</strong>
              </div>
            </li>
          </ol>
          <p className="parent-consent__duration">
            <svg className="parent-consent__duration-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            About 5-7 minutes total
          </p>
        </section>

        <section className="parent-consent__privacy" aria-labelledby="par-privacy-heading">
          <span className="parent-consent__privacy-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </span>
          <div className="parent-consent__privacy-body">
            <h2 id="par-privacy-heading">Your privacy is protected</h2>
            <ul className="parent-consent__privacy-list">
              <li>Identity data is encrypted and used only for legal compliance</li>
              <li>We comply with COPPA (US) and GDPR-K (EU) child safety laws</li>
              <li>You can revoke your child&apos;s access anytime from your dashboard</li>
              <li>The $1 card hold is released within 23 hours, you&apos;re not charged</li>
            </ul>
          </div>
        </section>

        <div className="parent-consent__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={onApprove}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Loading…" : `Set up parental control, let ${firstName} join`}
          </button>
          <button type="button" className="link-btn parent-consent__decline" onClick={onDecline}>
            I want to decline this request
          </button>
        </div>
      </div>
    </section>
  );
}

export function ParentDeclinedStep({
  childFirstName,
  onDone,
}: {
  childFirstName: string;
  onDone: () => void;
}) {
  return (
    <section className="screen page-centered">
      <div className="page-centered__inner text-center">
        <div className="toast-card__icon toast-card__icon--error" style={{ margin: "0 auto var(--space-6)" }}>
          ✕
        </div>
        <h1>Request declined</h1>
        <p className="subtitle mt-4">
          {childFirstName} has been notified. Their signup details have been removed for security.
        </p>
        <button type="button" className="btn btn--primary mt-8" onClick={onDone}>
          Done
        </button>
      </div>
    </section>
  );
}

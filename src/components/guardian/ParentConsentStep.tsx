"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { AuthPageCentered } from "@/components/auth/AuthPageCentered";
import { useDialogA11y } from "@/lib/accessibility/useDialogA11y";
import type { GuardianChildContext } from "@/lib/auth/guardian-flow";
import { FieldError } from "@/components/ui/FieldError";

export function ParentConsentStep({
  child,
  token,
  requiresActivationCode,
  onApprove,
  onDecline,
  isSubmitting,
}: {
  child: GuardianChildContext;
  token: string;
  requiresActivationCode: boolean;
  onApprove: () => void;
  onDecline: () => void;
  isSubmitting?: boolean;
}) {
  const firstName = child.firstName;
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  const closeCodePopup = useCallback(() => {
    if (isConfirming) return;
    setCodeOpen(false);
    setCodeError("");
  }, [isConfirming]);

  const { dialogRef } = useDialogA11y(codeOpen, closeCodePopup);

  function openCodePopup() {
    setCode("");
    setCodeError("");
    setCodeOpen(true);
  }

  async function handleConfirmCode() {
    const entered = code.replace(/\s+/g, "").toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(entered)) {
      setCodeError(`Enter the 6-character code ${firstName} shared with you.`);
      return;
    }

    setIsConfirming(true);
    setCodeError("");

    try {
      const response = await fetch("/api/guardian/confirm-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, code: entered }),
      });
      const data = await response.json();
      if (!response.ok) {
        setCodeError(data.error ?? "That code doesn't match. Check the code your child shared with you.");
        return;
      }

      setCodeOpen(false);
      onApprove();
    } catch {
      setCodeError("Unable to confirm the activation code.");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <AuthPageCentered innerClassName="parent-consent">
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
            id="btn-setup-parental-control"
            onClick={requiresActivationCode ? openCodePopup : onApprove}
            disabled={isSubmitting || isConfirming}
          >
            {isSubmitting ? "Loading…" : `Set up parental control, let ${firstName} join`}
          </button>
          <button type="button" className="link-btn parent-consent__decline" onClick={onDecline}>
            I want to decline this request
          </button>
        </div>

        {codeOpen ? (
          <div
            className="modal-backdrop is-open"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guardian-activation-code-title"
          >
            <div className="modal activation-code-modal text-center" ref={dialogRef} tabIndex={-1}>
              <h2 id="guardian-activation-code-title">Confirm the activation code</h2>
              <p className="activation-code-modal__note">
                Enter the code {firstName} shared with you for activation.
              </p>
              <div className="field mt-6 text-left">
                <label className="field-label" htmlFor="guardian-activation-code">
                  Activation code
                </label>
                <input
                  id="guardian-activation-code"
                  className={`input activation-code-modal__input${codeError ? " input--error" : ""}`}
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value.toUpperCase());
                    if (codeError) setCodeError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleConfirmCode();
                    }
                  }}
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={6}
                  aria-invalid={Boolean(codeError)}
                  aria-describedby="guardian-activation-code-error"
                  disabled={isConfirming}
                />
                <FieldError
                  id="guardian-activation-code-error"
                  message={codeError}
                  hidden={!codeError}
                  defaultMessage={`Enter the 6-character code ${firstName} shared with you.`}
                />
              </div>
              <div className="activation-code-modal__actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  id="btn-confirm-activation-code"
                  onClick={() => void handleConfirmCode()}
                  disabled={isConfirming}
                >
                  {isConfirming ? "Checking…" : "Confirm"}
                </button>
                <button
                  type="button"
                  className="btn btn--outline-info"
                  onClick={closeCodePopup}
                  disabled={isConfirming}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}
    </AuthPageCentered>
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
    <AuthPageCentered innerClassName="text-center">
      <div className="toast-card__icon toast-card__icon--error toast-card__icon--centered">
        ✕
      </div>
      <h1>Request declined</h1>
      <p className="subtitle mt-4">
        {childFirstName} has been notified. Their signup details have been removed for security.
      </p>
      <button type="button" className="btn btn--primary mt-8" onClick={onDone}>
        Done
      </button>
    </AuthPageCentered>
  );
}

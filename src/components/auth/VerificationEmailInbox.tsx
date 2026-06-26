"use client";

import { useEffect } from "react";

type VerificationEmailInboxProps = {
  open: boolean;
  email: string;
  verifyUrl: string;
  onClose: () => void;
};

export function VerificationEmailInbox({
  open,
  email,
  verifyUrl,
  onClose,
}: VerificationEmailInboxProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop is-open verify-email-inbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verify-email-inbox-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal verify-email-inbox">
        <button
          type="button"
          className="modal__close verify-email-inbox__close"
          aria-label="Close email"
          onClick={onClose}
        >
          ×
        </button>

        <p className="verify-email-inbox__label">Inbox preview</p>
        <h2 id="verify-email-inbox-title" className="verify-email-inbox__subject">
          Verify your InrCliq account
        </h2>

        <div className="verify-email-inbox__meta">
          <p className="verify-email__info-line">
            <span>From :</span> hello@inrcliq.com
          </p>
          <p className="verify-email__info-line">
            <span>To :</span> {email}
          </p>
          <p className="verify-email__info-line">
            <span>Subject :</span> Verify your InrCliq account
          </p>
        </div>

        <div className="verify-email-inbox__body">
          <p>Thanks for signing up. Confirm your email address to continue setting up your InrCliq account.</p>
          <p className="verify-email-inbox__action">
            <a href={verifyUrl} className="btn btn--primary verify-email-inbox__verify-btn">
              Verify email
            </a>
          </p>
          <p className="verify-email-inbox__link-label">Or copy this link:</p>
          <a href={verifyUrl} className="verify-email-inbox__link">
            {verifyUrl}
          </a>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useDialogA11y } from "@/lib/accessibility/useDialogA11y";

type LoginCodeInboxProps = {
  open: boolean;
  email: string;
  loginCode: string;
  onClose: () => void;
};

export function LoginCodeInbox({ open, email, loginCode, onClose }: LoginCodeInboxProps) {
  const [copied, setCopied] = useState(false);
  const { dialogRef } = useDialogA11y(open, onClose);

  if (!open) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(loginCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function handleClose() {
    setCopied(false);
    onClose();
  }

  return (
    <div
      className="modal-backdrop is-open verify-email-inbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-code-inbox-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div className="modal verify-email-inbox" ref={dialogRef} tabIndex={-1}>
        <button
          type="button"
          className="modal__close verify-email-inbox__close"
          aria-label="Close email"
          onClick={handleClose}
        >
          ×
        </button>

        <p className="verify-email-inbox__label">Inbox preview</p>
        <h2 id="login-code-inbox-title" className="verify-email-inbox__subject">
          Your InrCliq login code
        </h2>

        <div className="verify-email-inbox__meta">
          <p className="verify-email__info-line">
            <span>From :</span> hello@inrcliq.com
          </p>
          <p className="verify-email__info-line">
            <span>To :</span> {email}
          </p>
          <p className="verify-email__info-line">
            <span>Subject :</span> Your InrCliq login code
          </p>
        </div>

        <div className="verify-email-inbox__body">
          <p>Use this code to sign in to your InrCliq account. It expires soon.</p>
          <p className="verify-email-inbox__otp" aria-label={`Login code ${loginCode}`}>
            {loginCode}
          </p>
          <p className="verify-email-inbox__action">
            <button type="button" className="btn btn--primary verify-email-inbox__verify-btn" onClick={() => void handleCopy()}>
              {copied ? "Copied" : "Copy code"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

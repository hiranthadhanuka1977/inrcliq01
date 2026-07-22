"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type VerifyEmailInboxButtonProps = {
  id: string;
  label: string;
  expanded?: boolean;
  onClick: () => void;
};

export function VerifyEmailInboxButton({
  id,
  label,
  expanded = false,
  onClick,
}: VerifyEmailInboxButtonProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <button
      type="button"
      className="verify-email__inbox-btn"
      id={id}
      aria-label={label}
      aria-expanded={expanded}
      onClick={onClick}
    >
      <svg
        className="verify-email__inbox-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
      <span className="verify-email__inbox-badge" aria-hidden="true" />
    </button>,
    document.body,
  );
}

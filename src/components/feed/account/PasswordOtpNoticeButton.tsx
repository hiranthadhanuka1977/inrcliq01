"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  PASSWORD_OTP_NOTICE_EVENT,
  readPasswordOtpNotice,
  type PasswordOtpNotice,
} from "@/lib/feed/password-otp-notice";

export function PasswordOtpNoticeButton({
  hiddenUntilNotice = false,
  placement = "inline",
}: {
  hiddenUntilNotice?: boolean;
  /** Fixed top-right envelope, same control used on onboarding. */
  placement?: "inline" | "corner";
}) {
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState<PasswordOtpNotice | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function sync() {
      const next = readPasswordOtpNotice();
      setNotice(next);
      if (!next) setOpen(false);
    }
    sync();
    window.addEventListener(PASSWORD_OTP_NOTICE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PASSWORD_OTP_NOTICE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function copyCode() {
    if (!notice) return;
    try {
      await navigator.clipboard.writeText(notice.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function toggle() {
    if (!notice) return;
    setCopied(false);
    setOpen((current) => !current);
  }

  if (hiddenUntilNotice && !notice) return null;
  if (placement === "corner" && !mounted) return null;

  const control = (
    <div className={`password-otp-notice${placement === "corner" ? " password-otp-notice--corner" : ""}`} ref={rootRef}>
      <button
        type="button"
        className={placement === "corner" ? "verify-email__inbox-btn" : `nav-notify${notice ? " nav-notify--alert" : ""}`}
        aria-label={notice ? "Password code notification" : "Notifications"}
        aria-expanded={notice ? open : undefined}
        aria-controls={notice ? titleId : undefined}
        onClick={toggle}
      >
        {placement === "corner" ? (
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
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        )}
        {notice ? (
          <span className={placement === "corner" ? "verify-email__inbox-badge" : "nav-notify__dot"} aria-hidden="true" />
        ) : null}
      </button>
      {notice && open ? (
        <div className="password-otp-notice__panel" role="dialog" aria-labelledby={titleId}>
          <p className="password-otp-notice__label">Notification</p>
          <h2 id={titleId} className="password-otp-notice__title">
            Password code
          </h2>
          <p className="password-otp-notice__copy">
            Sent to {notice.email}. Use this code to choose a new password.
          </p>
          <p className="password-otp-notice__code" aria-label={`Password code ${notice.code}`}>
            {notice.code}
          </p>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => void copyCode()}>
            {copied ? "Copied" : "Copy code"}
          </button>
        </div>
      ) : null}
    </div>
  );

  if (placement === "corner") return createPortal(control, document.body);
  return control;
}

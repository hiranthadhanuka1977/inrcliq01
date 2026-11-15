"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDialogA11y } from "@/lib/accessibility/useDialogA11y";
import {
  ACTIVATION_CODE_DISMISSED_KEY,
  ACTIVATION_CODE_KEY,
  PARENT_INVITE_COOLDOWN_SECONDS,
} from "@/lib/auth/parent-invite.constants";
import { VerifyEmailInboxButton } from "@/components/auth/VerifyEmailInboxButton";
import { ParentApprovalEmailInbox } from "@/components/onboarding/ParentApprovalEmailInbox";

const PARENT_APPROVE_URL_KEY = "inrcliq_parent_approve_url";
const PARENT_WATCH_TOKEN_KEY = "inrcliq_parent_approval_watch";

type InviteStatus = {
  status: string;
  parentEmail: string;
  sentAt: string;
  expiresAt: string;
  childFirstName: string;
  activationCode?: string;
  codeCooldownRemaining?: number;
  resumeUrl?: string;
};

function readPromptedActivationCode() {
  const code = sessionStorage.getItem(ACTIVATION_CODE_KEY)?.trim() ?? "";
  if (!code) return "";
  const dismissed = sessionStorage.getItem(ACTIVATION_CODE_DISMISSED_KEY);
  return dismissed === code ? "" : code;
}

function formatRelativeExpiry(expiresAt: string) {
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) return "Expired";

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  return `Expires in ${hours}h ${minutes}m`;
}

function formatSentAgo(sentAt: string) {
  const minutes = Math.floor((Date.now() - new Date(sentAt).getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 1) return "Just now";
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export function ParentWaitingView() {
  const router = useRouter();
  const [status, setStatus] = useState<InviteStatus | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [error, setError] = useState("");
  const [codeNotice, setCodeNotice] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [isResendingCode, setIsResendingCode] = useState(false);
  const [approveUrl, setApproveUrl] = useState("");
  const [watchToken, setWatchToken] = useState("");
  const [inboxOpen, setInboxOpen] = useState(false);
  const [activationCode, setActivationCode] = useState("");
  const [activationPopupOpen, setActivationPopupOpen] = useState(false);

  function persistApproveUrl(url: string) {
    setApproveUrl(url);
    sessionStorage.setItem(PARENT_APPROVE_URL_KEY, url);
  }

  function persistWatchToken(token: string) {
    setWatchToken(token);
    sessionStorage.setItem(PARENT_WATCH_TOKEN_KEY, token);
  }

  const closeActivationPopup = useCallback(() => {
    setActivationPopupOpen(false);
    if (activationCode) {
      sessionStorage.setItem(ACTIVATION_CODE_DISMISSED_KEY, activationCode);
    }
  }, [activationCode]);

  const { dialogRef: activationDialogRef } = useDialogA11y(activationPopupOpen, closeActivationPopup);

  function showActivationCode(code: string) {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    sessionStorage.setItem(ACTIVATION_CODE_KEY, normalized);
    setActivationCode(normalized);
    if (sessionStorage.getItem(ACTIVATION_CODE_DISMISSED_KEY) !== normalized) {
      setActivationPopupOpen(true);
    }
  }

  useEffect(() => {
    const prompted = readPromptedActivationCode();
    if (prompted) {
      setActivationCode(prompted);
      setActivationPopupOpen(true);
    }

    const savedApproveUrl = sessionStorage.getItem(PARENT_APPROVE_URL_KEY);
    if (savedApproveUrl) {
      setApproveUrl(savedApproveUrl);
    }
    const savedWatchToken = sessionStorage.getItem(PARENT_WATCH_TOKEN_KEY);
    if (savedWatchToken) {
      setWatchToken(savedWatchToken);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      const storedWatch = sessionStorage.getItem(PARENT_WATCH_TOKEN_KEY) || watchToken;
      const statusUrl = storedWatch
        ? `/api/onboarding/parent-invite/resend?watch=${encodeURIComponent(storedWatch)}`
        : "/api/onboarding/parent-invite/resend";

      const response = await fetch(statusUrl);
      if (!response.ok || cancelled) return;

      const data = (await response.json()) as InviteStatus & {
        resumeUrl?: string;
        watchToken?: string;
      };
      if (cancelled) return;

      if (typeof data.watchToken === "string" && data.watchToken) {
        persistWatchToken(data.watchToken);
      }

      if (data.status) setStatus(data);

      if (data.status === "PENDING" && typeof data.activationCode === "string") {
        showActivationCode(data.activationCode);
      } else if (data.status === "DECLINED") {
        setActivationPopupOpen(false);
      }

      if (typeof data.codeCooldownRemaining === "number") {
        setCodeCooldown(data.codeCooldownRemaining);
      }

      if (data.status === "APPROVED") {
        if (data.resumeUrl) {
          window.location.assign(data.resumeUrl);
          return;
        }
        window.location.assign("/onboarding/approved");
      }
    }

    void loadStatus();
    const timer = window.setInterval(() => {
      void loadStatus();
    }, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [router, watchToken]);

  const isDeclined = status?.status === "DECLINED";

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (codeCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCodeCooldown((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [codeCooldown]);

  function handleShowCode() {
    const code = (
      activationCode ||
      status?.activationCode ||
      sessionStorage.getItem(ACTIVATION_CODE_KEY) ||
      ""
    ).trim();
    if (!code) {
      setError("Your activation code isn't available yet.");
      return;
    }
    setError("");
    sessionStorage.removeItem(ACTIVATION_CODE_DISMISSED_KEY);
    showActivationCode(code);
  }

  async function handleResendCode() {
    if (codeCooldown > 0 || isResendingCode) return;
    setIsResendingCode(true);
    setError("");
    setCodeNotice("");

    try {
      const response = await fetch("/api/onboarding/parent-invite/resend-code", { method: "POST" });
      const data = await response.json();

      if (response.status === 429) {
        setCodeCooldown(data.cooldownRemaining ?? PARENT_INVITE_COOLDOWN_SECONDS);
        return;
      }

      if (!response.ok) {
        setError(data.error ?? "Unable to email your activation code.");
        return;
      }

      setCodeCooldown(data.cooldownRemaining ?? PARENT_INVITE_COOLDOWN_SECONDS);
      setCodeNotice("We sent the activation code to your email.");
    } catch {
      setError("Unable to email your activation code.");
    } finally {
      setIsResendingCode(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding/parent-invite/resend", { method: "POST" });
      const data = await response.json();

      if (response.status === 429) {
        setCooldown(data.cooldownRemaining ?? PARENT_INVITE_COOLDOWN_SECONDS);
        return;
      }

      if (!response.ok) {
        setError(data.error ?? "Unable to resend invite.");
        return;
      }

      setCooldown(data.cooldownRemaining ?? PARENT_INVITE_COOLDOWN_SECONDS);

      if (data.approveUrl) {
        persistApproveUrl(data.approveUrl);
      }
      if (typeof data.watchToken === "string" && data.watchToken) {
        persistWatchToken(data.watchToken);
      }
    } catch {
      setError("Unable to resend invite.");
    } finally {
      setIsResending(false);
    }
  }

  const codeCooldownPercent =
    codeCooldown > 0
      ? Math.min(100, ((PARENT_INVITE_COOLDOWN_SECONDS - codeCooldown) / PARENT_INVITE_COOLDOWN_SECONDS) * 100)
      : 0;

  const cooldownPercent =
    cooldown > 0
      ? Math.min(100, ((PARENT_INVITE_COOLDOWN_SECONDS - cooldown) / PARENT_INVITE_COOLDOWN_SECONDS) * 100)
      : 0;

  const visibleCode = activationCode || status?.activationCode || "";

  return (
    <>
      {!isDeclined && activationPopupOpen && activationCode ? (
        <div
          className="modal-backdrop is-open"
          role="dialog"
          aria-modal="true"
          aria-labelledby="activation-code-title"
        >
          <div className="modal activation-code-modal text-center" ref={activationDialogRef} tabIndex={-1}>
            <h2 id="activation-code-title">Activation code</h2>
            <p className="verify-email-inbox__otp activation-code-modal__code" aria-label={`Activation code ${activationCode}`}>
              {activationCode}
            </p>
            <p className="activation-code-modal__note">Share this code with your guardian for activation.</p>
            <button
              type="button"
              className="btn btn--primary mt-8"
              id="btn-activation-code-ok"
              onClick={closeActivationPopup}
            >
              OK
            </button>
          </div>
        </div>
      ) : null}

      {!isDeclined && approveUrl ? (
        <VerifyEmailInboxButton
          id="btn-open-parent-approval-inbox"
          label="Open parent approval email"
          expanded={inboxOpen}
          onClick={() => setInboxOpen(true)}
        />
      ) : null}

      <ParentApprovalEmailInbox
        open={inboxOpen}
        parentEmail={status?.parentEmail ?? ""}
        childFirstName={status?.childFirstName ?? "Your child"}
        approveUrl={approveUrl}
        onClose={() => setInboxOpen(false)}
      />

      {isDeclined ? (
        <>
          <div className="toast-card__icon toast-card__icon--error toast-card__icon--centered">
            ✕
          </div>
          <h1>Request declined</h1>
          <p className="subtitle mt-4">
            Your parent or guardian declined your request. You can send a new invite to a different email address.
          </p>
          <div className="parent-waiting__action-buttons mt-8">
            <Link href="/onboarding/parent" className="btn btn--primary parent-waiting__action-btn">
              Try a different parent email
            </Link>
          </div>
        </>
      ) : (
        <>
      <h1>Waiting for your Parent&apos;s approval</h1>
      <p className="subtitle mt-2">
        We have sent a Email with link to your Guardian, for your safety, it needs to be approved within 24 hours.
      </p>

      <div className="parent-waiting__status mt-8">
        <div className="parent-waiting__status-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>
        <div className="parent-waiting__status-body">
          <strong className="parent-waiting__status-title">Email sent</strong>
          <span className="parent-waiting__status-meta" id="parent-waiting-timing">
            {status?.sentAt
              ? `${formatSentAgo(status.sentAt)} · ${formatRelativeExpiry(status.expiresAt)}`
              : "Checking the invite…"}
          </span>
        </div>
        <span className="parent-waiting__badge">Pending</span>
      </div>

      <div className="parent-waiting__notice mt-4">
        <span className="parent-waiting__notice-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </span>
        <p>
          The approval link expires in 24 hours. You can log in any time before then to check the status of your
          request.
        </p>
      </div>

      <div className="parent-waiting__actions-block">
        <p className="verify-email__resend parent-waiting__resend">
          Email didn&apos;t reach your parent?{" "}
          <button
            type="button"
            className="link-btn verify-email__resend-link"
            id="btn-resend-invite"
            onClick={handleResend}
            disabled={cooldown > 0 || isResending}
          >
            <svg className="verify-email__resend-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Resend email
          </button>
        </p>
        <div className={`parent-waiting__resend-cooldown resend-cooldown${cooldown > 0 ? "" : " hidden"}`} id="parent-resend-cooldown" aria-live="polite">
          <div
            className="parent-waiting__resend-progress resend-progress"
            id="parent-resend-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={PARENT_INVITE_COOLDOWN_SECONDS}
            aria-valuenow={PARENT_INVITE_COOLDOWN_SECONDS - cooldown}
          >
            <div
              className="parent-waiting__resend-progress-bar resend-progress-bar"
              id="parent-resend-progress-bar"
              style={{ width: `${cooldownPercent}%` }}
            />
          </div>
          <p className="parent-waiting__resend-countdown resend-countdown" id="parent-resend-countdown">
            Resend available in {cooldown}s
          </p>
        </div>
        <p className="verify-email__resend parent-waiting__resend parent-waiting__code-actions">
          Didn&apos;t get your activation code?{" "}
          <button
            type="button"
            className="link-btn verify-email__resend-link"
            id="btn-show-activation-code"
            onClick={handleShowCode}
            disabled={!visibleCode}
          >
            Show my code
          </button>
          {" · "}
          <button
            type="button"
            className="link-btn verify-email__resend-link"
            id="btn-resend-activation-code"
            onClick={() => void handleResendCode()}
            disabled={!visibleCode || codeCooldown > 0 || isResendingCode}
          >
            {isResendingCode ? "Sending…" : "Email me the code again"}
          </button>
        </p>
        {codeNotice ? (
          <p className="parent-waiting__code-notice" role="status">
            {codeNotice}
          </p>
        ) : null}
        <div className={`parent-waiting__resend-cooldown resend-cooldown${codeCooldown > 0 ? "" : " hidden"}`} id="code-resend-cooldown" aria-live="polite">
          <div
            className="parent-waiting__resend-progress resend-progress"
            id="code-resend-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={PARENT_INVITE_COOLDOWN_SECONDS}
            aria-valuenow={PARENT_INVITE_COOLDOWN_SECONDS - codeCooldown}
          >
            <div
              className="parent-waiting__resend-progress-bar resend-progress-bar"
              id="code-resend-progress-bar"
              style={{ width: `${codeCooldownPercent}%` }}
            />
          </div>
          <p className="parent-waiting__resend-countdown resend-countdown" id="code-resend-countdown">
            Code email available in {codeCooldown}s
          </p>
        </div>
        <div className="parent-waiting__action-buttons">
          <Link href="/onboarding/parent" className="btn btn--secondary parent-waiting__action-btn" id="link-change-parent-email">
            Use a different parent email
          </Link>
        </div>
      </div>

      <div className="parent-waiting__info-alert mt-8" role="status">
        <span className="parent-waiting__info-alert-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </span>
        <p>You can close this page, we&apos;ll email you when its done</p>
      </div>

      {error ? (
        <p className="field-error mt-4" role="alert">
          {error}
        </p>
      ) : null}
        </>
      )}
    </>
  );
}

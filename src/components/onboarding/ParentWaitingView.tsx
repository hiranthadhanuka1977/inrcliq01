"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PARENT_INVITE_COOLDOWN_SECONDS } from "@/lib/auth/parent-invite.constants";
import { VerifyEmailInboxButton } from "@/components/auth/VerifyEmailInboxButton";
import { ParentApprovalEmailInbox } from "@/components/onboarding/ParentApprovalEmailInbox";

const PARENT_APPROVE_URL_KEY = "inrcliq_parent_approve_url";

type InviteStatus = {
  status: string;
  parentEmail: string;
  sentAt: string;
  expiresAt: string;
  childFirstName: string;
};

function formatRelativeExpiry(expiresAt: string) {
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) return "Expired";

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  return `Expires in ${hours}h ${minutes}m`;
}

export function ParentWaitingView() {
  const router = useRouter();
  const [status, setStatus] = useState<InviteStatus | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [approveUrl, setApproveUrl] = useState("");
  const [inboxOpen, setInboxOpen] = useState(false);

  function persistApproveUrl(url: string) {
    setApproveUrl(url);
    sessionStorage.setItem(PARENT_APPROVE_URL_KEY, url);
  }

  useEffect(() => {
    const savedApproveUrl = sessionStorage.getItem(PARENT_APPROVE_URL_KEY);
    if (savedApproveUrl) {
      setApproveUrl(savedApproveUrl);
    }
  }, []);

  useEffect(() => {
    async function loadStatus() {
      const response = await fetch("/api/onboarding/parent-invite/resend");
      if (!response.ok) return;
      const data = await response.json();
      if (data.status) setStatus(data);
      if (data.status === "APPROVED") {
        router.push("/onboarding/approved");
        router.refresh();
      }
    }

    loadStatus();
    const timer = window.setInterval(loadStatus, 10000);
    return () => window.clearInterval(timer);
  }, [router]);

  const isDeclined = status?.status === "DECLINED";

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

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
    } catch {
      setError("Unable to resend invite.");
    } finally {
      setIsResending(false);
    }
  }

  const cooldownPercent =
    cooldown > 0
      ? Math.min(100, ((PARENT_INVITE_COOLDOWN_SECONDS - cooldown) / PARENT_INVITE_COOLDOWN_SECONDS) * 100)
      : 0;

  return (
    <>
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

      <div className="auth-split__step-header" aria-hidden="true" />
      {isDeclined ? (
        <>
          <div className="toast-card__icon toast-card__icon--error" style={{ margin: "0 auto var(--space-6)" }}>
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
            {status?.sentAt ? `Just now · ${formatRelativeExpiry(status.expiresAt)}` : "Just now · Expires in 23h 59m"}
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
          We have created a temporary account for 48 hours, so you can log in at any time to check the status of your
          approval request.
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

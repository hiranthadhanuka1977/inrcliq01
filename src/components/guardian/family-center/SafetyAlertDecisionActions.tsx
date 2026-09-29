"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type AlertAction = "allow" | "reject" | "block";

async function patchAlert(alertId: string, action: AlertAction) {
  const response = await fetch(`/api/family-circle/alerts/${encodeURIComponent(alertId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
  return { ok: response.ok, status: response.status, ...data };
}

export function SafetyAlertModal({
  titleId,
  title,
  children,
  onClose,
  busy,
}: {
  titleId: string;
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  useEffect(() => {
    closeRef.current = onClose;
    busyRef.current = busy;
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) closeRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="modal-backdrop is-open"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div ref={dialogRef} tabIndex={-1} className="modal family-center__alert-modal">
        <h2 id={titleId} className="family-center__alert-modal-title">
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function useAlertRefresh() {
  const router = useRouter();
  return () => {
    window.dispatchEvent(new Event("family-circle:alerts-changed"));
    router.refresh();
  };
}

export default function SafetyAlertDecisionActions({
  alertId,
  childFirstName,
  counterpartName,
  recipientZone,
}: {
  alertId: string;
  childFirstName: string;
  counterpartName: string;
  recipientZone: string | null;
}) {
  const refresh = useAlertRefresh();
  const [confirm, setConfirm] = useState<"allow" | "reject" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function decide(action: "allow" | "reject") {
    setBusy(true);
    setError(null);
    try {
      const result = await patchAlert(alertId, action);
      if (result.status === 409 && result.code === "HOLD_ALREADY_DECIDED") {
        setConfirm(null);
        setNotice(result.error || "Another guardian already decided on this message.");
        refresh();
        return;
      }
      if (!result.ok) throw new Error(result.error || "Unable to update this alert.");
      setConfirm(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update this alert.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn--primary btn--sm"
        onClick={() => {
          setError(null);
          setConfirm("allow");
        }}
      >
        Allow
      </button>
      <button
        type="button"
        className="btn btn--sm family-center__alert-reject"
        onClick={() => {
          setError(null);
          setConfirm("reject");
        }}
      >
        Reject
      </button>
      {notice ? (
        <span className="family-center__alert-toast" role="status">
          {notice}
        </span>
      ) : null}

      {confirm === "allow" ? (
        <SafetyAlertModal
          titleId={`alert-allow-${alertId}`}
          title={`Deliver this message to ${childFirstName}?`}
          onClose={() => setConfirm(null)}
          busy={busy}
        >
          <p className="family-center__alert-modal-copy">
            {childFirstName} will receive the original message from {counterpartName}.
          </p>
          {recipientZone === "KIDS" ? (
            <p className="family-center__alert-modal-copy">
              {counterpartName} will be added to {childFirstName}&apos;s Approved friends &amp; adults circle.
            </p>
          ) : null}
          {error ? (
            <p className="family-center__alert-modal-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="family-center__alert-modal-actions">
            <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void decide("allow")}>
              {busy ? "Delivering…" : "Deliver message"}
            </button>
            <button type="button" className="btn btn--outline-info" disabled={busy} onClick={() => setConfirm(null)}>
              Cancel
            </button>
          </div>
        </SafetyAlertModal>
      ) : null}

      {confirm === "reject" ? (
        <SafetyAlertModal
          titleId={`alert-reject-${alertId}`}
          title="Reject this message?"
          onClose={() => setConfirm(null)}
          busy={busy}
        >
          <p className="family-center__alert-modal-copy">It will never be delivered to {childFirstName}.</p>
          {error ? (
            <p className="family-center__alert-modal-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="family-center__alert-modal-actions">
            <button type="button" className="btn btn--danger" disabled={busy} onClick={() => void decide("reject")}>
              {busy ? "Rejecting…" : "Reject"}
            </button>
            <button type="button" className="btn btn--outline-info" disabled={busy} onClick={() => setConfirm(null)}>
              Cancel
            </button>
          </div>
        </SafetyAlertModal>
      ) : null}
    </>
  );
}

export function SafetyAlertBlockButton({
  alertId,
  counterpartName,
  childFirstName,
  blocked,
}: {
  alertId: string;
  counterpartName: string;
  childFirstName: string;
  blocked: boolean;
}) {
  const refresh = useAlertRefresh();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(blocked);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <button type="button" className="btn btn--ghost btn--sm" disabled>
        Blocked
      </button>
    );
  }

  async function block() {
    setBusy(true);
    setError(null);
    try {
      const result = await patchAlert(alertId, "block");
      if (!result.ok) throw new Error(result.error || "Unable to block this contact.");
      setDone(true);
      setConfirming(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to block this contact.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirming(true)}>
        Block {counterpartName}
      </button>
      {confirming ? (
        <SafetyAlertModal
          titleId={`alert-block-${alertId}`}
          title={`Block ${counterpartName}?`}
          onClose={() => setConfirming(false)}
          busy={busy}
        >
          <p className="family-center__alert-modal-copy">
            {counterpartName} won&apos;t be able to send direct messages to {childFirstName}. You can change
            this later in DM settings.
          </p>
          {error ? (
            <p className="family-center__alert-modal-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="family-center__alert-modal-actions">
            <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void block()}>
              {busy ? "Blocking…" : `Block ${counterpartName}`}
            </button>
            <button
              type="button"
              className="btn btn--outline-info"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        </SafetyAlertModal>
      ) : null}
    </>
  );
}

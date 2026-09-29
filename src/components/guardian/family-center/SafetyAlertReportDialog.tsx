"use client";

import { useState } from "react";
import { SafetyAlertModal } from "@/components/guardian/family-center/SafetyAlertDecisionActions";

const REASONS = [
  { id: "sexual_content", label: "Sexual content" },
  { id: "grooming_concern", label: "Grooming concern" },
  { id: "harassment", label: "Harassment" },
  { id: "other", label: "Something else" },
] as const;

const DETAILS_MAX = 1000;

export default function SafetyAlertReportDialog({
  alertId,
  counterpartName,
}: {
  alertId: string;
  counterpartName: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]["id"] | "">("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function close() {
    if (busy) return;
    setOpen(false);
    setError(null);
  }

  async function submit() {
    if (!reason) {
      setError("Choose a reason for the report.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/family-circle/alerts/${encodeURIComponent(alertId)}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details: details.trim() || undefined }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to submit this report.");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit this report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(true)}>
        {submitted ? "Reported" : "Report"}
      </button>
      {open ? (
        <SafetyAlertModal
          titleId={`alert-report-${alertId}`}
          title={submitted ? "Report submitted" : `Report ${counterpartName}`}
          onClose={close}
          busy={busy}
        >
          {submitted ? (
            <>
              <p className="family-center__alert-modal-copy">Thanks — our safety team will review this.</p>
              <div className="family-center__alert-modal-actions">
                <button type="button" className="btn btn--outline-info" onClick={close}>
                  Close
                </button>
              </div>
            </>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <fieldset className="family-center__report-reasons">
                <legend className="family-center__alert-modal-copy">What&apos;s the concern?</legend>
                {REASONS.map((option) => (
                  <label key={option.id} className="family-center__report-reason">
                    <input
                      type="radio"
                      name={`report-reason-${alertId}`}
                      value={option.id}
                      checked={reason === option.id}
                      onChange={() => {
                        setReason(option.id);
                        setError(null);
                      }}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </fieldset>
              <label className="family-center__report-details">
                <span>Anything else we should know? (optional)</span>
                <textarea
                  value={details}
                  maxLength={DETAILS_MAX}
                  rows={4}
                  onChange={(event) => setDetails(event.target.value)}
                />
                <span className="family-center__report-count">
                  {details.length}/{DETAILS_MAX}
                </span>
              </label>
              {error ? (
                <p className="family-center__alert-modal-error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="family-center__alert-modal-actions">
                <button type="submit" className="btn btn--primary" disabled={busy}>
                  {busy ? "Submitting…" : "Submit report"}
                </button>
                <button type="button" className="btn btn--outline-info" disabled={busy} onClick={close}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </SafetyAlertModal>
      ) : null}
    </>
  );
}

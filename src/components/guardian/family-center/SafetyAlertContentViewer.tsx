"use client";

import { useState } from "react";
import { SafetyAlertModal } from "@/components/guardian/family-center/SafetyAlertDecisionActions";

type ViewerState =
  | { step: "closed" }
  | { step: "interstitial" }
  | { step: "loading" }
  | { step: "shown"; body: string; category: string }
  | { step: "error"; message: string };

export default function SafetyAlertContentViewer({ alertId }: { alertId: string }) {
  const [state, setState] = useState<ViewerState>({ step: "closed" });

  // Text only lives in component state while the dialog is open; closing discards it.
  const close = () => setState({ step: "closed" });

  async function show() {
    setState({ step: "loading" });
    try {
      const response = await fetch(`/api/family-circle/alerts/${encodeURIComponent(alertId)}/view`, {
        method: "POST",
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as {
        lightMaskedBody?: string;
        flaggedCategory?: string;
        error?: string;
      };
      if (!response.ok || typeof data.lightMaskedBody !== "string") {
        throw new Error(
          response.status === 410
            ? "This message is no longer available."
            : data.error || "Unable to load this message.",
        );
      }
      setState({ step: "shown", body: data.lightMaskedBody, category: data.flaggedCategory ?? "" });
    } catch (err) {
      setState({
        step: "error",
        message: err instanceof Error ? err.message : "Unable to load this message.",
      });
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn--outline-brand btn--sm"
        onClick={() => setState({ step: "interstitial" })}
      >
        View message
      </button>
      {state.step !== "closed" ? (
        <SafetyAlertModal
          titleId={`alert-view-${alertId}`}
          title={state.step === "shown" ? "Flagged message" : "View flagged message?"}
          onClose={close}
          busy={state.step === "loading"}
        >
          {state.step === "interstitial" || state.step === "loading" ? (
            <>
              <p className="family-center__alert-modal-copy">
                This message was flagged as sexual. Explicit words and contact details are partly hidden.
              </p>
              <div className="family-center__alert-modal-actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={state.step === "loading"}
                  onClick={() => void show()}
                >
                  {state.step === "loading" ? "Loading…" : "Show message"}
                </button>
                <button
                  type="button"
                  className="btn btn--outline-info"
                  disabled={state.step === "loading"}
                  onClick={close}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : null}
          {state.step === "shown" ? (
            <>
              {state.category ? (
                <p className="family-center__alert-modal-meta">{state.category}</p>
              ) : null}
              <div className="family-center__alert-viewer-text" aria-readonly="true">
                {state.body}
              </div>
              <div className="family-center__alert-modal-actions">
                <button type="button" className="btn btn--outline-info" onClick={close}>
                  Close
                </button>
              </div>
            </>
          ) : null}
          {state.step === "error" ? (
            <>
              <p className="family-center__alert-modal-error" role="alert">
                {state.message}
              </p>
              <div className="family-center__alert-modal-actions">
                <button type="button" className="btn btn--outline-info" onClick={close}>
                  Close
                </button>
              </div>
            </>
          ) : null}
        </SafetyAlertModal>
      ) : null}
    </>
  );
}

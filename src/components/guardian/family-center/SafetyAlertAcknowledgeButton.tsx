"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SafetyAlertAcknowledgeButton({ alertId }: { alertId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function acknowledge() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/family-circle/alerts/${encodeURIComponent(alertId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "acknowledge" }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to acknowledge this alert.");
      }
      window.dispatchEvent(new Event("family-circle:alerts-changed"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to acknowledge this alert.");
      setBusy(false);
    }
  }

  return (
    <span className="family-center__alert-ack">
      <button
        type="button"
        className="btn btn--outline-brand btn--sm"
        disabled={busy}
        onClick={() => void acknowledge()}
      >
        {busy ? "Saving…" : "Acknowledge"}
      </button>
      {error ? (
        <span className="family-center__alert-ack-error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}

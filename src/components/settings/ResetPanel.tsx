"use client";

import { useState } from "react";
import { resetPrototype } from "@/lib/prototype/reset-prototype";

export function ResetPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleReset() {
    const confirmed = window.confirm(
      "Reset the entire platform? This will delete all users, sessions, and related records, and sign you out in this browser.",
    );
    if (!confirmed) return;

    setLoading(true);
    setError("");
    setMessage("");

    const result = await resetPrototype();

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setMessage("All users and related data have been removed. Signing out…");
  }

  return (
    <div className="settings-panel">
      <div className="settings-panel__head">
        <h1 className="settings-panel__title">Reset</h1>
        <p className="settings-panel__subtitle">
          Clear all users and related platform data, remove this browser&apos;s session cookie, and
          sign out. Use this to start from a clean slate during development.
        </p>
      </div>

      {error ? (
        <p className="field-error settings-panel__error" role="alert">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="settings-message" role="status">
          {message}
        </p>
      ) : null}

      <button
        type="button"
        className="btn btn--danger"
        onClick={handleReset}
        disabled={loading}
      >
        {loading ? "Resetting…" : "Reset all users"}
      </button>
    </div>
  );
}

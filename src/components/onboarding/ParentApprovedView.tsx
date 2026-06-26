"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ParentApprovedViewProps = {
  firstName: string;
};

export function ParentApprovedView({ firstName }: ParentApprovedViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleContinue() {
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding/acknowledge-approval", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Unable to continue.");
        setLoading(false);
        return;
      }

      router.push(data.redirectTo ?? "/onboarding/password");
      router.refresh();
    } catch {
      setError("Unable to continue.");
      setLoading(false);
    }
  }

  return (
    <div className="text-center">
      <div className="toast-card__icon" style={{ margin: "0 auto var(--space-6)" }}>
        ✓
      </div>
      <h1>Your parent approved!</h1>
      <p className="subtitle mt-4">
        Welcome to InrCliq, {firstName}. Your parent or guardian approved your request. You can
        progress to the next step and complete your profile.
      </p>
      {error ? (
        <p className="field-error mt-4" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="btn btn--primary mt-8"
        onClick={handleContinue}
        disabled={loading}
      >
        {loading ? "Please wait…" : "Continue"}
      </button>
    </div>
  );
}

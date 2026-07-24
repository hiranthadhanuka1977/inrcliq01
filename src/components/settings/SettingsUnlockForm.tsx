"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCenterLayout } from "@/components/auth/AuthCenterLayout";

export function SettingsUnlockForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/settings/users";

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/settings/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Incorrect password.");
        setLoading(false);
        return;
      }

      const safeNext =
        nextPath.startsWith("/settings") && !nextPath.startsWith("/settings/unlock")
          ? nextPath
          : "/settings/users";
      router.replace(safeNext);
      router.refresh();
    } catch {
      setError("Unable to unlock settings.");
      setLoading(false);
    }
  }

  return (
    <AuthCenterLayout screenId="screen-settings-unlock">
      <div className="text-center">
        <h1>Settings access</h1>
        <p className="subtitle mt-4">Enter the admin password to continue to settings.</p>

        <form className="gap-3 mt-8 text-left" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label" htmlFor="settings-unlock-password">
              Password
            </label>
            <input
              className={`input${error ? " input--error" : ""}`}
              type="password"
              id="settings-unlock-password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) setError("");
              }}
              aria-invalid={Boolean(error)}
              aria-describedby="settings-unlock-error"
              autoFocus
            />
            {error ? (
              <p className="field-error" id="settings-unlock-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <button type="submit" className="btn btn--primary" disabled={loading || !password.trim()}>
            {loading ? "Checking…" : "Continue"}
          </button>
        </form>
      </div>
    </AuthCenterLayout>
  );
}

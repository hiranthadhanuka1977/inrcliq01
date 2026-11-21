"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getSignupPasswordFieldError, isPasswordRequirementMet } from "@/lib/form-validation";

export default function SetPasswordView({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requirementMet = isPasswordRequirementMet(password);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setApiError("");
    const message = getSignupPasswordFieldError(password);
    if (message) {
      setFieldError(message);
      return;
    }
    setFieldError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/feed/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setApiError(data.error ?? "Unable to save password.");
        return;
      }
      router.push("/feed/me/completion");
      router.refresh();
    } catch {
      setApiError("Unable to save password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="main-content account-profile" id="main">
      <div className="account-profile__card">
        <p className="account-profile__eyebrow">Account</p>
        <h1 className="account-profile__name">Set a password</h1>
        <p className="account-profile__handle">
          {hasPassword
            ? "This account already has a password."
            : "Add a password so you can sign in without an email code."}
        </p>

        {hasPassword ? null : (
          <form onSubmit={(event) => void handleSubmit(event)}>
            <div className="field mt-8">
              <label className="field-label" htmlFor="profile-set-password">
                Password
              </label>
              <input
                className={`input${fieldError ? " input--error" : ""}`}
                type="password"
                id="profile-set-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                aria-invalid={Boolean(fieldError)}
                disabled={isSubmitting}
              />
              {fieldError ? (
                <p className="field-error mt-3" role="alert">
                  {fieldError}
                </p>
              ) : null}
              <p className={`password-requirement mt-4${requirementMet ? " is-met" : ""}`}>
                <span className="password-requirement__mark" aria-hidden="true" />
                <span>At least 8 characters, with letters and numbers</span>
              </p>
            </div>
            {apiError ? (
              <p className="field-error mt-4" role="alert">
                {apiError}
              </p>
            ) : null}
            <div className="account-profile__actions">
              <Link href="/feed/me/completion" className="btn btn--secondary">
                Cancel
              </Link>
              <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save password"}
              </button>
            </div>
          </form>
        )}

        {hasPassword ? (
          <div className="account-profile__actions">
            <Link href="/feed/me/completion" className="btn btn--secondary">
              Back
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}

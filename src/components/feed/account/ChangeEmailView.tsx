"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { getEmailValidationError } from "@/lib/form-validation";

export default function ChangeEmailView({
  currentEmail,
  error,
}: {
  currentEmail: string;
  error?: "invalid" | "taken" | null;
}) {
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [apiError, setApiError] = useState(
    error === "taken"
      ? "That email was claimed by another account before you confirmed it."
      : error === "invalid"
        ? "That verification link is invalid or has expired."
        : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setApiError("");
    const validationError = getEmailValidationError(email, "Please enter your new email address.");
    if (validationError) {
      setFieldError(validationError);
      emailRef.current?.focus();
      return;
    }
    if (email.trim().toLowerCase() === currentEmail.toLowerCase()) {
      setFieldError("That is already your email address.");
      emailRef.current?.focus();
      return;
    }

    setFieldError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/feed/me/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        email?: string;
      };
      if (!response.ok || !data.email) {
        setApiError(data.error ?? "Unable to send the verification email.");
        return;
      }
      setSentTo(data.email);
    } catch {
      setApiError("Unable to send the verification email.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="main-content account-profile" id="main">
      <div className="account-profile__card">
        <p className="account-profile__eyebrow">Account</p>
        <h1 className="account-profile__name">Change your email</h1>
        <p className="account-profile__handle">
          {sentTo
            ? `We sent a verification link to ${sentTo}. ${currentEmail} stays your email until you open that link.`
            : `Enter the new address. ${currentEmail} stays your email until you confirm the verification message.`}
        </p>

        {sentTo ? (
          <div className="account-profile__actions">
            <Link href="/feed/me/edit" className="btn btn--secondary">
              Back to profile information
            </Link>
            <button type="button" className="btn btn--primary" onClick={() => setSentTo("")}>
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)}>
            <div className="field account-profile__handle-form">
              <label className="field-label" htmlFor="profile-change-email">
                New email
              </label>
              <input
                ref={emailRef}
                className="input"
                type="email"
                id="profile-change-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                spellCheck={false}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? "profile-change-email-error" : undefined}
                disabled={isSubmitting}
              />
              {fieldError ? (
                <p className="field-error mt-3" id="profile-change-email-error" role="alert">
                  {fieldError}
                </p>
              ) : null}
            </div>

            {apiError ? (
              <p className="field-error mt-4" role="alert">
                {apiError}
              </p>
            ) : null}

            <div className="account-profile__actions">
              <Link
                href="/feed/me/edit"
                className="btn btn--secondary"
                aria-disabled={isSubmitting}
                tabIndex={isSubmitting ? -1 : undefined}
                onClick={(event) => {
                  if (isSubmitting) event.preventDefault();
                }}
              >
                Cancel
              </Link>
              <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
                {isSubmitting ? "Sending…" : "Send verification email"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

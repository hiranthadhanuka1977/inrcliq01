"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { getNameValidationState } from "@/lib/form-validation";

export default function ChangeNameView({
  firstName: initialFirst,
  lastName: initialLast,
}: {
  firstName: string;
  lastName: string;
}) {
  const router = useRouter();
  const firstRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [fieldError, setFieldError] = useState("");
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setApiError("");
    const validation = getNameValidationState(firstName, lastName);
    if (validation.message) {
      setFieldError(validation.message);
      (validation.firstEmpty ? firstRef.current : document.getElementById("profile-change-last-name"))?.focus();
      return;
    }
    if (firstName.trim().length > 40 || lastName.trim().length > 40) {
      setFieldError("Use 40 characters or fewer for each name.");
      return;
    }

    setFieldError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/feed/me/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        fullName?: string;
      };
      if (!response.ok || !data.fullName) {
        setApiError(data.error ?? "Unable to save your name.");
        return;
      }
      router.push("/feed/me/edit");
      router.refresh();
    } catch {
      setApiError("Unable to save your name.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="main-content account-profile" id="main">
      <div className="account-profile__card">
        <p className="account-profile__eyebrow">Account</p>
        <h1 className="account-profile__name">Change your name</h1>
        <p className="account-profile__handle">
          This is the name people see on your profile.
        </p>

        <form onSubmit={(event) => void handleSubmit(event)}>
          <div className="field account-profile__handle-form">
            <span className="field-label">Full name</span>
            <div className="name-row">
              <div className="field">
                <label className="field-label sr-only" htmlFor="profile-change-first-name">
                  First name
                </label>
                <input
                  ref={firstRef}
                  className="input"
                  type="text"
                  id="profile-change-first-name"
                  maxLength={40}
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="First name"
                  autoComplete="given-name"
                  aria-invalid={Boolean(fieldError)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="field">
                <label className="field-label sr-only" htmlFor="profile-change-last-name">
                  Last name
                </label>
                <input
                  className="input"
                  type="text"
                  id="profile-change-last-name"
                  maxLength={40}
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Last name"
                  autoComplete="family-name"
                  aria-invalid={Boolean(fieldError)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            {fieldError ? (
              <p className="field-error mt-3" role="alert">
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
              {isSubmitting ? "Saving…" : "Save name"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

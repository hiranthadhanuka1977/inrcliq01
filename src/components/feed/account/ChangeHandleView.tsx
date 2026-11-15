"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { suggestHandle } from "@/lib/auth/credentials";
import { isHandleRequirementMet, validateHandle } from "@/lib/form-validation";

function bareHandle(value: string | null | undefined) {
  return value?.trim().replace(/^@/, "") ?? "";
}

export default function ChangeHandleView({
  firstName,
  lastName,
  initialHandle,
}: {
  firstName: string | null;
  lastName: string | null;
  initialHandle: string | null;
}) {
  const router = useRouter();
  const handleRef = useRef<HTMLInputElement>(null);
  const existing = bareHandle(initialHandle);
  const [handle, setHandle] = useState(existing);
  const [fieldError, setFieldError] = useState("");
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!existing) {
      setHandle(suggestHandle(firstName ?? "", lastName ?? ""));
    }
    handleRef.current?.focus();
  }, [existing, firstName, lastName]);

  const changing = Boolean(existing);
  const requirementMet = isHandleRequirementMet(handle);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setApiError("");
    setFieldError("");
    const validationError = validateHandle(handle);
    if (validationError) {
      setFieldError(validationError);
      handleRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/feed/me/handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        handle?: string;
      };

      if (!response.ok || !data.handle) {
        setApiError(data.error ?? "Unable to save handle.");
        return;
      }

      router.push("/feed/me/edit");
      router.refresh();
    } catch {
      setApiError("Unable to save handle.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="main-content account-profile" id="main">
      <div className="account-profile__card">
        <p className="account-profile__eyebrow">Account</p>
        <h1 className="account-profile__name">
          {changing ? "Change your handle" : "Choose your handle"}
        </h1>
        <p className="account-profile__handle">
          {changing
            ? "Update the @name people use to find and mention you."
            : "Your unique @name on InrCliq — how others find and mention you."}
        </p>

        <form onSubmit={(event) => void handleSubmit(event)}>
          <div className="field account-profile__handle-form">
            <label className="field-label" htmlFor="profile-change-handle">
              Handle
            </label>
            <div className="handle-input">
              <span className="handle-input__prefix" aria-hidden="true">
                @
              </span>
              <input
                ref={handleRef}
                className="input handle-input__field"
                type="text"
                id="profile-change-handle"
                maxLength={24}
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                placeholder="yourname"
                autoComplete="username"
                spellCheck={false}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={
                  fieldError
                    ? "profile-change-handle-error profile-change-handle-requirement"
                    : "profile-change-handle-requirement"
                }
                disabled={isSubmitting}
              />
            </div>
            {fieldError ? (
              <p className="field-error mt-3" id="profile-change-handle-error" role="alert">
                {fieldError}
              </p>
            ) : null}
            <p
              className={`password-requirement mt-4${requirementMet ? " is-met" : ""}`}
              id="profile-change-handle-requirement"
            >
              <span className="password-requirement__mark" aria-hidden="true" />
              <span>No spaces · Max 24 characters · Letters, numbers, underscores, and periods only</span>
            </p>
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
              {isSubmitting ? "Saving…" : "Save handle"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

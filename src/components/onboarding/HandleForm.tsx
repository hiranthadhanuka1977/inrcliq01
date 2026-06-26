"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  isHandleRequirementMet,
  validateHandle,
} from "@/lib/form-validation";
import { suggestHandle } from "@/lib/auth/credentials";

export function HandleForm({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) {
  const router = useRouter();
  const handleRef = useRef<HTMLInputElement>(null);
  const [handle, setHandle] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!initialized) {
      setHandle(suggestHandle(firstName, lastName));
      setInitialized(true);
    }
  }, [firstName, lastName, initialized]);

  const requirementMet = isHandleRequirementMet(handle);

  async function submit(skip = false) {
    setApiError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/onboarding/handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(skip ? { skip: true } : { handle }),
      });

      const data = await response.json();

      if (!response.ok) {
        setApiError(data.error ?? "Unable to save handle.");
        return;
      }

      router.push(data.redirectTo ?? "/home");
      router.refresh();
    } catch {
      setApiError("Unable to save handle.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationError = validateHandle(handle);
    if (validationError) {
      window.alert(validationError);
      handleRef.current?.focus();
      return;
    }
    await submit(false);
  }

  return (
    <>
      <div className="auth-split__step-header" aria-hidden="true" />
      <h1>Choose your handle</h1>
      <p className="subtitle mt-2">Your unique @name on InrCliq — how others find and mention you.</p>
      <p className="password-alt mt-6">
        You can skip choosing a handle and continue onboarding. You can always set your @name later in account
        settings.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="field mt-8">
          <label className="field-label" htmlFor="signup-handle">
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
              id="signup-handle"
              maxLength={24}
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              placeholder="yourname"
              autoComplete="username"
              spellCheck={false}
              aria-describedby="signup-handle-requirement"
            />
          </div>
          <p className={`password-requirement mt-4${requirementMet ? " is-met" : ""}`} id="signup-handle-requirement">
            <span className="password-requirement__mark" aria-hidden="true" />
            <span>No spaces · Max 24 characters · Letters, numbers, underscores, and periods only</span>
          </p>
        </div>

        {apiError ? (
          <p className="field-error mt-4" role="alert">
            {apiError}
          </p>
        ) : null}

        <button type="submit" className="btn btn--primary mt-8" id="btn-handle-next" disabled={isSubmitting}>
          <span className="btn__label">{isSubmitting ? "Saving…" : "Next"}</span>
          <span className="btn__progress" aria-hidden="true">
            <span className="btn__progress-bar" />
          </span>
        </button>
      </form>

      <div className="password-skip-row mt-4">
        <button
          type="button"
          className="link-btn password-skip-row__action"
          id="btn-handle-skip"
          disabled={isSubmitting}
          onClick={() => submit(true)}
        >
          Skip for now — choose handle later
        </button>
        <span className="help-tip">
          <button
            type="button"
            className="help-tip__trigger"
            aria-label="About skipping handle setup"
            aria-describedby="handle-skip-tip"
          >
            <svg className="help-tip__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
          <span className="help-tip__content" id="handle-skip-tip" role="tooltip">
            When you skip, others may not be able to @mention you until you choose a handle. You can add one anytime in
            account settings.
          </span>
        </span>
      </div>
    </>
  );
}

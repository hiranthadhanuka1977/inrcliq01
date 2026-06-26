"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  getSignupPasswordFieldError,
  isPasswordRequirementMet,
} from "@/lib/form-validation";
import { FieldError } from "@/components/ui/FieldError";

export function PasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState({ visible: false, message: "" });
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requirementMet = isPasswordRequirementMet(password);

  useEffect(() => {
    sessionStorage.removeItem("inrcliq_signup_email");
    passwordRef.current?.focus();
  }, []);

  function clearFieldErrors() {
    setFieldError({ visible: false, message: "" });
  }

  function setPasswordFieldError(message: string) {
    setFieldError({ visible: true, message });
  }

  function updatePasswordErrorsOnInput(value: string) {
    if (!fieldError.visible) return;
    const message = getSignupPasswordFieldError(value);
    if (message) setPasswordFieldError(message);
    else clearFieldErrors();
  }

  function validatePasswordField(focusOnError = true) {
    const message = getSignupPasswordFieldError(password);
    clearFieldErrors();
    if (message) {
      setPasswordFieldError(message);
      if (focusOnError) {
        passwordRef.current?.focus();
      }
      return false;
    }
    return true;
  }

  async function submit(skip = false) {
    setApiError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/onboarding/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(skip ? { skip: true } : { password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setApiError(data.error ?? "Unable to save password.");
        return;
      }

      router.push(data.redirectTo ?? "/onboarding/handle");
      router.refresh();
    } catch {
      setApiError("Unable to save password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validatePasswordField()) return;
    await submit(false);
  }

  return (
    <>
      <div className="auth-split__step-header" aria-hidden="true" />
      <h1>Create a password</h1>
      <p className="subtitle mt-2">Secure your account so you can sign in to InrCliq anytime.</p>
      <p className="password-alt mt-6">
        You can skip setting a password and sign in with a code sent to{" "}
        <span className="password-alt__email" id="password-skip-email">
          {email}
        </span>{" "}
        instead. You can always add a password later.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="field mt-8">
          <label className="field-label" htmlFor="signup-password">
            Password
          </label>
          <div className="input-with-action">
            <input
              ref={passwordRef}
              className={`input${fieldError.visible ? " input--error" : ""}`}
              type={showPassword ? "text" : "password"}
              id="signup-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                updatePasswordErrorsOnInput(event.target.value);
              }}
              placeholder="Create password"
              autoComplete="new-password"
              aria-describedby="signup-password-error signup-password-requirement"
              aria-invalid={fieldError.visible}
            />
            <button
              type="button"
              className="input-with-action__btn"
              id="btn-signup-password-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((value) => !value)}
            >
              <svg
                className={`password-toggle__icon password-toggle__icon--show${showPassword ? " hidden" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg
                className={`password-toggle__icon password-toggle__icon--hide${showPassword ? "" : " hidden"}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </button>
          </div>
          <FieldError
            id="signup-password-error"
            message={fieldError.message}
            hidden={!fieldError.visible}
            defaultMessage="Please enter your password."
          />
          <p className={`password-requirement mt-4${requirementMet ? " is-met" : ""}`} id="signup-password-requirement">
            <span className="password-requirement__mark" aria-hidden="true" />
            <span>Use at least 8 characters with a mix of letters and numbers.</span>
          </p>
        </div>

        {apiError ? (
          <p className="field-error mt-4" role="alert">
            {apiError}
          </p>
        ) : null}

        <button type="submit" className="btn btn--primary mt-8" id="btn-password-next" disabled={isSubmitting}>
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
          id="btn-password-skip"
          disabled={isSubmitting}
          onClick={() => submit(true)}
        >
          Skip for now — use email code to log in
        </button>
        <span className="help-tip">
          <button
            type="button"
            className="help-tip__trigger"
            aria-label="About passwordless sign-in"
            aria-describedby="password-skip-tip"
          >
            <svg className="help-tip__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
          <span className="help-tip__content" id="password-skip-tip" role="tooltip">
            When you skip, we&apos;ll email you a one-time login code each time you sign in—no password needed. You can
            add a password anytime in account settings.
          </span>
        </span>
      </div>
    </>
  );
}

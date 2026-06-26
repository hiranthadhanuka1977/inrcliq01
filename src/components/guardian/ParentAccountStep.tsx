"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRIES, US_STATES } from "@/lib/constants/locations";
import { getSignupPasswordFieldError, isPasswordRequirementMet } from "@/lib/form-validation";

export function ParentAccountStep({
  parentEmail,
  onBack,
  onSubmit,
  isSubmitting,
  error,
}: {
  parentEmail: string;
  onBack: () => void;
  onSubmit: (data: { password: string; country: string; region: string | null }) => void;
  isSubmitting?: boolean;
  error?: string;
}) {
  const passwordRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [country, setCountry] = useState("LK");
  const [region, setRegion] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [fieldError, setFieldError] = useState({ visible: false, message: "" });

  useEffect(() => {
    passwordRef.current?.focus();
  }, []);

  function handleSubmit() {
    if (!confirmed) {
      alert("Please confirm that the information provided is true and correct.");
      return;
    }

    const message = getSignupPasswordFieldError(password);
    if (message) {
      setFieldError({ visible: true, message });
      passwordRef.current?.focus();
      return;
    }

    if (country === "US" && !region) {
      alert("Please select your state.");
      return;
    }

    onSubmit({ password, country, region: country === "US" ? region : null });
  }

  return (
    <>
      <button type="button" className="parent-signup__back link-btn" id="btn-parent-back" onClick={onBack}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      <h1 className="parent-signup__title">Create your parent account</h1>
      <p className="subtitle mt-2">Just a few details, your identity will be confirmed in the next step.</p>

      <div className="parent-signup__form mt-8">
        <div className="field">
          <label className="field-label" htmlFor="par-parent-email">
            Your email
          </label>
          <div className="input-with-action">
            <input
              className="input input--readonly"
              type="email"
              id="par-parent-email"
              value={parentEmail}
              readOnly
            />
            <button type="button" className="input-with-action__btn" aria-label="Edit email">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="field mt-6">
          <label className="field-label" htmlFor="par-parent-password">
            Create a password
          </label>
          <div className="input-with-action">
            <input
              ref={passwordRef}
              className="input"
              type={showPassword ? "text" : "password"}
              id="par-parent-password"
              placeholder="Password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (fieldError.visible) {
                  const message = getSignupPasswordFieldError(event.target.value);
                  if (message) setFieldError({ visible: true, message });
                  else setFieldError({ visible: false, message: "" });
                }
              }}
              aria-describedby="par-parent-password-error par-parent-password-requirement"
              aria-invalid={fieldError.visible}
            />
            <button
              type="button"
              className="input-with-action__btn"
              id="btn-par-parent-password-toggle"
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
          <p
            className={`field-error${fieldError.visible ? "" : " hidden"}`}
            id="par-parent-password-error"
            role="alert"
          >
            {fieldError.message || "Please enter your password."}
          </p>
          <p
            className={`password-requirement mt-4${isPasswordRequirementMet(password) ? " is-met" : ""}`}
            id="par-parent-password-requirement"
          >
            <span className="password-requirement__mark" aria-hidden="true" />
            <span>Use at least 8 characters with a mix of letters and numbers.</span>
          </p>
        </div>

        <div className="field mt-8">
          <div className="field-label-row">
            <span className="field-label">Country of residence</span>
            <span className="help-tip">
              <button
                type="button"
                className="help-tip__trigger"
                aria-label="About country of residence"
                aria-describedby="par-country-tip"
              >
                <svg className="help-tip__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </button>
              <span className="help-tip__content" id="par-country-tip" role="tooltip">
                We use this to apply the correct child safety and privacy rules for your region.
              </span>
            </span>
          </div>
          <div className="field mt-2">
            <label className="field-label sr-only" htmlFor="par-parent-country">
              Country
            </label>
            <select
              className="select"
              id="par-parent-country"
              aria-label="Country"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
            >
              {COUNTRIES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.flag} {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className={`field mt-4${country === "US" ? "" : " hidden"}`}>
            <label className="field-label" htmlFor="par-parent-state">
              State
            </label>
            <select
              className="select"
              id="par-parent-state"
              aria-label="State"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
            >
              <option value="" disabled>
                Select state
              </option>
              {US_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="parent-signup__confirm mt-6">
          <input
            type="checkbox"
            id="par-parent-confirm"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>I confirm that the information provided is true and correct.</span>
        </label>

        <button
          type="button"
          className="btn btn--primary mt-8"
          id="btn-parent-submit"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting…" : "Submit and verify identity"}
        </button>

        {error ? (
          <p className="field-error mt-4" role="alert">
            {error}
          </p>
        ) : null}

        <div className="parent-signup__id-notice mt-6" role="note">
          <span className="parent-signup__id-notice-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </span>
          <p className="parent-signup__id-notice-text">
            Your date of birth will be captured from your ID scan in the next step.
          </p>
        </div>
      </div>
    </>
  );
}

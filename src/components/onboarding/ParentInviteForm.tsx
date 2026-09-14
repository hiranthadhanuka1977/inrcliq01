"use client";

import { useRouter } from "next/navigation";
import { KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { useDialogA11y } from "@/lib/accessibility/useDialogA11y";
import { DOB_MONTHS, getDefaultAdultDob, getParentEmailValidationError } from "@/lib/form-validation";
import { Disclosure } from "@/components/auth/Disclosure";
import { FieldError } from "@/components/ui/FieldError";

const PARENT_APPROVE_URL_KEY = "inrcliq_parent_approve_url";

function buildYearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 81 }, (_, index) => currentYear - index);
}

function buildDayOptions() {
  return Array.from({ length: 31 }, (_, index) => index + 1);
}

export function ParentInviteForm({
  firstName,
  initialDob,
}: {
  firstName: string;
  initialDob?: { month: number; day: number; year: number } | null;
}) {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const dobTitleId = useId();
  const [parentEmail, setParentEmail] = useState("");
  const [fieldError, setFieldError] = useState({ visible: false, message: "" });
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaults = getDefaultAdultDob();
  const [dobOpen, setDobOpen] = useState(false);
  const [month, setMonth] = useState(String(initialDob?.month ?? defaults.month));
  const [day, setDay] = useState(String(initialDob?.day ?? defaults.day));
  const [year, setYear] = useState(String(initialDob?.year ?? defaults.year));
  const [dobError, setDobError] = useState("");
  const [isSavingDob, setIsSavingDob] = useState(false);

  const years = useMemo(() => buildYearOptions(), []);
  const days = useMemo(() => buildDayOptions(), []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      emailRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function closeDobModal() {
    if (isSavingDob) return;
    setDobOpen(false);
    setDobError("");
  }

  const { dialogRef } = useDialogA11y(dobOpen, closeDobModal);

  function clearFieldErrors() {
    setFieldError({ visible: false, message: "" });
  }

  function setEmailFieldError(message: string) {
    setFieldError({ visible: true, message });
  }

  function updateEmailErrorsOnInput(value: string) {
    if (!fieldError.visible) return;
    const message = getParentEmailValidationError(value);
    if (message) setEmailFieldError(message);
    else clearFieldErrors();
  }

  function validateEmailField() {
    const message = getParentEmailValidationError(parentEmail);
    clearFieldErrors();
    if (message) {
      setEmailFieldError(message);
      emailRef.current?.focus();
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    setApiError("");
    if (!validateEmailField()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/onboarding/parent-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentEmail: parentEmail.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setApiError(data.error ?? "Unable to send parent invite.");
        return;
      }

      if (data.approveUrl) {
        sessionStorage.setItem(PARENT_APPROVE_URL_KEY, data.approveUrl);
      }

      router.push(data.redirectTo ?? "/onboarding/waiting");
      router.refresh();
    } catch {
      setApiError("Unable to send parent invite.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openDobModal() {
    setApiError("");
    setDobError("");
    const next = initialDob ?? getDefaultAdultDob();
    setMonth(String(next.month));
    setDay(String(next.day));
    setYear(String(next.year));
    setDobOpen(true);
  }

  async function handleSaveDob() {
    if (isSavingDob) return;
    setDobError("");
    setIsSavingDob(true);

    try {
      const response = await fetch("/api/onboarding/fix-age", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: Number.parseInt(month, 10),
          day: Number.parseInt(day, 10),
          year: Number.parseInt(year, 10),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setDobError(data.error ?? "Unable to update date of birth.");
        return;
      }
      setDobOpen(false);
      router.push(data.redirectTo ?? "/onboarding/password");
      router.refresh();
    } catch {
      setDobError("Unable to update date of birth.");
    } finally {
      setIsSavingDob(false);
    }
  }

  function handleEmailKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void handleSubmit();
  }

  return (
    <>
      <h1>One quick step before you join</h1>
      <p className="subtitle mt-2">
        Based on your Country&apos;s eSafety policies, a parent or guardian needs to approve your account. Enter their
        email below and we will request for their Approval.
      </p>

      <ol className="parent-steps" aria-label="Parent approval steps">
        <li className="parent-steps__item">
          <span className="parent-steps__num" aria-hidden="true">
            1
          </span>
          <span className="parent-steps__text">Enter your parent&apos;s email</span>
        </li>
        <li className="parent-steps__item">
          <span className="parent-steps__num" aria-hidden="true">
            2
          </span>
          <span className="parent-steps__text">Parent receives a link and approves</span>
        </li>
        <li className="parent-steps__item">
          <span className="parent-steps__num" aria-hidden="true">
            3
          </span>
          <span className="parent-steps__text">Your account is activated</span>
        </li>
      </ol>

      <div className="field mt-8">
        <label className="field-label" htmlFor="parent-email">
          Email
        </label>
        <input
          ref={emailRef}
          className={`input${fieldError.visible ? " input--error" : ""}`}
          type="email"
          id="parent-email"
          value={parentEmail}
          onChange={(event) => {
            setParentEmail(event.target.value);
            updateEmailErrorsOnInput(event.target.value);
          }}
          onKeyDown={handleEmailKeyDown}
          placeholder="Parent or guardian's email"
          autoComplete="off"
          aria-describedby="parent-email-error"
          aria-invalid={fieldError.visible}
        />
        <FieldError
          id="parent-email-error"
          message={fieldError.message}
          hidden={!fieldError.visible}
          defaultMessage="Please enter your parent or guardian's email address."
        />
      </div>

      <Disclosure
        label="Here's what we'll send them"
        id="parent-email-preview"
        triggerId="parent-email-preview-trigger"
        panelId="parent-email-preview-panel"
      >
        <p className="verify-email__info-line">
          <span>From :</span> InrCliq
        </p>
        <p className="verify-email__info-line">
          <span>Subject :</span> <span id="parent-preview-subject">{firstName} wants to join InrCliq</span>
        </p>
        <p className="verify-email__info-detail" id="parent-preview-body">
          &quot;{firstName} has requested to Signup with InrCliq, we need your approval......&quot;
        </p>
      </Disclosure>

      {apiError ? (
        <p className="field-error mt-4" role="alert">
          {apiError}
        </p>
      ) : null}

      <button
        type="button"
        className="btn btn--primary mt-8"
        id="btn-send-parent-invite"
        disabled={isSubmitting || isSavingDob}
        onClick={() => void handleSubmit()}
      >
        <span className="btn__label">{isSubmitting ? "Sending…" : "Send email to Parent/Guardian"}</span>
        <span className="btn__progress" aria-hidden="true">
          <span className="btn__progress-bar" />
        </span>
      </button>

      <div className="password-skip-row mt-4">
        <button
          type="button"
          className="link-btn password-skip-row__action"
          id="link-fix-birthday"
          disabled={isSubmitting || isSavingDob}
          onClick={openDobModal}
        >
          I made a mistake. I&apos;m actually 18+
        </button>
      </div>

      {dobOpen ? (
        <div
          className="modal-backdrop is-open"
          role="dialog"
          aria-modal="true"
          aria-labelledby={dobTitleId}
        >
          <div className="modal text-center" ref={dialogRef} tabIndex={-1}>
            <h2 id={dobTitleId}>Correct your date of birth</h2>
            <p className="subtitle mt-4">
              Update your date of birth to continue as an adult. You&apos;ll set a password next.
            </p>

            <div className="field mt-8 text-left">
              <span className="field-label">Date of birth</span>
              <div className="dob-row">
                <select
                  className="select"
                  id="fix-age-dob-month"
                  aria-label="Month"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  disabled={isSavingDob}
                >
                  {DOB_MONTHS.map((label, index) => (
                    <option key={label} value={String(index + 1)}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  className="select"
                  id="fix-age-dob-day"
                  aria-label="Day"
                  value={day}
                  onChange={(event) => setDay(event.target.value)}
                  disabled={isSavingDob}
                >
                  {days.map((value) => (
                    <option key={value} value={String(value)}>
                      {value}
                    </option>
                  ))}
                </select>
                <select
                  className="select"
                  id="fix-age-dob-year"
                  aria-label="Year"
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  disabled={isSavingDob}
                >
                  {years.map((value) => (
                    <option key={value} value={String(value)}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {dobError ? (
              <p className="field-error mt-4" role="alert">
                {dobError}
              </p>
            ) : null}

            <button
              type="button"
              className="btn btn--primary mt-8"
              onClick={() => void handleSaveDob()}
              disabled={isSavingDob}
            >
              {isSavingDob ? "Saving…" : "Save and continue"}
            </button>
            <button
              type="button"
              className="btn btn--outline-info mt-4"
              onClick={closeDobModal}
              disabled={isSavingDob}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

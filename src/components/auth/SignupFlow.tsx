"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { COUNTRIES, US_STATES } from "@/lib/constants/locations";
import { EMAIL_VERIFY_COOLDOWN_SECONDS } from "@/lib/auth/email-verification.constants";
import {
  DOB_MONTHS,
  getDefaultAdultDob,
  getLandingEmailValidationError,
  getNameValidationState,
} from "@/lib/form-validation";
import { formatVerifyEmailDisplay } from "@/lib/utils/email-display";
import { Disclosure } from "@/components/auth/Disclosure";
import { FieldError } from "@/components/ui/FieldError";
import { SignupProgressBar } from "@/components/auth/SignupProgressBar";

type Step = 1 | 2 | 3;

const SIGNUP_EMAIL_KEY = "inrcliq_signup_email";

const GoogleIcon = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const AppleIcon = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

function buildYearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 81 }, (_, index) => currentYear - index);
}

function buildDayOptions() {
  return Array.from({ length: 31 }, (_, index) => index + 1);
}

function applyDefaultDob(setters: {
  setMonth: (value: string) => void;
  setDay: (value: string) => void;
  setYear: (value: string) => void;
}) {
  const defaults = getDefaultAdultDob();
  setters.setMonth(String(defaults.month));
  setters.setDay(String(defaults.day));
  setters.setYear(String(defaults.year));
}

export function SignupFlow() {
  const emailRef = useRef<HTMLInputElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLSelectElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [signupMethod, setSignupMethod] = useState<"email" | null>(null);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");
  const [country, setCountry] = useState("LK");
  const [region, setRegion] = useState("California");

  const [emailError, setEmailError] = useState({ visible: false, message: "" });
  const [nameError, setNameError] = useState({
    visible: false,
    message: "",
    firstEmpty: false,
    lastEmpty: false,
  });
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const years = useMemo(() => buildYearOptions(), []);
  const days = useMemo(() => buildDayOptions(), []);

  const cardClass = step === 3 ? "auth-center__card--wide" : "";
  const innerClass = [
    step === 2 ? "auth-split__auth-inner--join" : "",
    step === 3 ? "auth-split__auth-inner--wide" : "",
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    const savedEmail = sessionStorage.getItem(SIGNUP_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
      setStep(3);
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  function clearEmailErrors() {
    setEmailError({ visible: false, message: "" });
  }

  function setEmailFieldError(message: string) {
    setEmailError({ visible: true, message });
  }

  function clearNameErrors() {
    setNameError({ visible: false, message: "", firstEmpty: false, lastEmpty: false });
  }

  function setNameFieldError(state: ReturnType<typeof getNameValidationState>) {
    setNameError({ visible: true, ...state });
  }

  function updateEmailErrorsOnInput(value: string) {
    if (!emailError.visible) return;
    const message = getLandingEmailValidationError(value);
    if (message) setEmailFieldError(message);
    else clearEmailErrors();
  }

  function updateNameErrorsOnInput(nextFirst: string, nextLast: string) {
    if (!nameError.visible) return;
    const state = getNameValidationState(nextFirst, nextLast);
    if (state.message) setNameFieldError(state);
    else clearNameErrors();
  }

  function validateEmailField() {
    const message = getLandingEmailValidationError(email);
    clearEmailErrors();
    if (message) {
      setEmailFieldError(message);
      emailRef.current?.focus();
      return false;
    }
    return true;
  }

  function validateNameFields() {
    const state = getNameValidationState(firstName, lastName);
    clearNameErrors();
    if (state.message) {
      setNameFieldError(state);
      (state.firstEmpty ? firstNameRef.current : document.getElementById("landing-last-name") as HTMLInputElement | null)?.focus();
      return false;
    }
    return true;
  }

  function clearJoinFormFields() {
    setEmail("");
    setFirstName("");
    setLastName("");
    applyDefaultDob({ setMonth, setDay, setYear });
    clearEmailErrors();
    clearNameErrors();
  }

  function startEmailSignup() {
    setSignupMethod("email");
    clearJoinFormFields();
    setStep(2);
    window.setTimeout(() => emailRef.current?.focus(), 0);
  }

  function handleBack() {
    setStep(1);
    setSignupMethod(null);
    setApiError("");
    clearEmailErrors();
    clearNameErrors();
  }

  function handleChangeEmail() {
    sessionStorage.removeItem(SIGNUP_EMAIL_KEY);
    setStep(2);
    window.setTimeout(() => emailRef.current?.focus(), 0);
  }

  async function handleJoinSubmit(event: FormEvent) {
    event.preventDefault();
    setApiError("");
    clearEmailErrors();
    clearNameErrors();

    if (signupMethod === "email" && !validateEmailField()) return;
    if (!validateNameFields()) return;

    if (!month || !day || !year) {
      window.alert("Please enter your full date of birth.");
      monthRef.current?.focus();
      return;
    }

    if (country === "US" && !region) {
      window.alert("Please select your state.");
      document.getElementById("landing-state")?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          month: Number(month),
          day: Number(day),
          year: Number(year),
          country,
          region: country === "US" ? region : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setApiError(data.error ?? "Unable to complete signup.");
        return;
      }

      sessionStorage.setItem(SIGNUP_EMAIL_KEY, data.email);
      setEmail(data.email);
      setCooldown(data.cooldownRemaining ?? EMAIL_VERIFY_COOLDOWN_SECONDS);
      setStep(3);

      if (data.devVerifyUrl) {
        console.info(`Dev verify URL: ${data.devVerifyUrl}`);
      }
    } catch {
      setApiError("Unable to complete signup.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);

    try {
      const response = await fetch("/api/auth/verify-email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.status === 429) {
        setCooldown(data.cooldownRemaining ?? EMAIL_VERIFY_COOLDOWN_SECONDS);
        return;
      }

      if (!response.ok) {
        setApiError(data.error ?? "Unable to resend verification email.");
        return;
      }

      setCooldown(data.cooldownRemaining ?? EMAIL_VERIFY_COOLDOWN_SECONDS);

      if (data.devVerifyUrl) {
        console.info(`Dev verify URL: ${data.devVerifyUrl}`);
      }
    } catch {
      setApiError("Unable to resend verification email.");
    } finally {
      setIsResending(false);
    }
  }

  const formattedEmail = formatVerifyEmailDisplay(email);
  const emailTitle = formattedEmail.includes("...") ? email : "";
  const cooldownPercent =
    cooldown > 0
      ? Math.min(100, ((EMAIL_VERIFY_COOLDOWN_SECONDS - cooldown) / EMAIL_VERIFY_COOLDOWN_SECONDS) * 100)
      : 0;

  return (
    <>
    <section className={`auth-center${step >= 2 ? " auth-center--signup-step" : ""}`}>
      <div className={`auth-center__card${cardClass ? ` ${cardClass}` : ""}`} id="signup-auth-card">
        <div className={`auth-split__auth-inner${innerClass ? ` ${innerClass}` : ""}`} id="landing-auth-inner">
          <div className="auth-split__steps">
            <div className={`auth-split__step${step === 1 ? " is-active" : ""}`} id="landing-step-1">
              <h2>Choose how to sign up</h2>
              <p className="subtitle mt-2">Continue with a social account or use your email.</p>

              <div className="auth-age-notice mt-6" role="note" aria-label="Age requirements">
                <p className="auth-age-notice__label">
                  <svg
                    className="auth-age-notice__icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Age requirements
                </p>
                <p className="auth-age-notice__text">
                  We apply age rules based on your country. Users under legal age need a parent or guardian to approve
                  their account.
                </p>
              </div>

              <div className="gap-3 mt-8">
                <button type="button" className="btn btn--secondary" data-oauth="google" disabled>
                  <GoogleIcon />
                  Continue with Google
                </button>
                <button type="button" className="btn btn--dark" data-oauth="apple" disabled>
                  <AppleIcon />
                  Continue with Apple
                </button>
                <div className="divider">or</div>
                <button type="button" className="btn btn--outline-brand" id="btn-email-signup" onClick={startEmailSignup}>
                  Continue with email
                </button>
              </div>

              <p className="auth-legal mt-8">
                By continuing, you agree to our <a href="#">Terms and Conditions</a> and{" "}
                <a href="#">Privacy Policy</a>.
              </p>
              <p className="auth-switch mt-6">
                Already have an account?{" "}
                <Link href="/" className="link-btn">
                  Log in
                </Link>
              </p>
            </div>

            <div className={`auth-split__step${step === 2 ? " is-active" : ""}`} id="landing-step-2">
              <div className="auth-split__step-header">
                <button
                  type="button"
                  className="back-btn auth-split__back"
                  id="btn-landing-back"
                  aria-label="Back"
                  onClick={handleBack}
                >
                  ←
                </button>
              </div>
              <h2>Join InrCliq</h2>
              <p className="subtitle mt-2">
                Tell us a bit about yourself so we can keep the platform safe and age-appropriate.
              </p>

              <form onSubmit={handleJoinSubmit}>
                {signupMethod === "email" ? (
                  <>
                    <div className="field mt-8" id="landing-join-email-field">
                      <label className="field-label" htmlFor="landing-join-email">
                        Email address
                      </label>
                      <input
                        ref={emailRef}
                        className={`input${emailError.visible ? " input--error" : ""}`}
                        type="email"
                        id="landing-join-email"
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          updateEmailErrorsOnInput(event.target.value);
                        }}
                        placeholder="you@example.com"
                        autoComplete="email"
                        aria-describedby="landing-join-email-error landing-join-email-hint"
                        aria-invalid={emailError.visible}
                      />
                      <FieldError
                        id="landing-join-email-error"
                        message={emailError.message}
                        hidden={!emailError.visible}
                        defaultMessage="Please enter your email address."
                      />
                      <p className="field-hint" id="landing-join-email-hint">
                        Your primary login identifier. We&apos;ll verify this email in the next step.
                      </p>
                    </div>
                    <hr className="auth-join-divider" aria-hidden="true" />
                  </>
                ) : null}

                <div className="field mt-8">
                  <span className="field-label">Name</span>
                  <div className="name-row">
                    <div className="field">
                      <label className="field-label sr-only" htmlFor="landing-first-name">
                        First name
                      </label>
                      <input
                        ref={firstNameRef}
                        className={`input${nameError.visible && nameError.firstEmpty ? " input--error" : ""}`}
                        type="text"
                        id="landing-first-name"
                        value={firstName}
                        onChange={(event) => {
                          setFirstName(event.target.value);
                          updateNameErrorsOnInput(event.target.value, lastName);
                        }}
                        placeholder="First name"
                        autoComplete="given-name"
                        aria-describedby="landing-name-error"
                        aria-invalid={nameError.visible && nameError.firstEmpty}
                      />
                    </div>
                    <div className="field">
                      <label className="field-label sr-only" htmlFor="landing-last-name">
                        Last name
                      </label>
                      <input
                        className={`input${nameError.visible && nameError.lastEmpty ? " input--error" : ""}`}
                        type="text"
                        id="landing-last-name"
                        value={lastName}
                        onChange={(event) => {
                          setLastName(event.target.value);
                          updateNameErrorsOnInput(firstName, event.target.value);
                        }}
                        placeholder="Last name"
                        autoComplete="family-name"
                        aria-describedby="landing-name-error"
                        aria-invalid={nameError.visible && nameError.lastEmpty}
                      />
                    </div>
                  </div>
                  <FieldError
                    id="landing-name-error"
                    message={nameError.message}
                    hidden={!nameError.visible}
                    defaultMessage="Please enter your first name and last name."
                  />
                </div>

                <div className="field mt-6">
                  <div className="field-label-row">
                    <span className="field-label">Date of birth</span>
                    <span className="help-tip help-tip--link">
                      <button
                        type="button"
                        className="help-tip__trigger help-tip__trigger--link"
                        aria-describedby="join-important-notice-tip"
                      >
                        <svg
                          className="help-tip__icon"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        Important notice
                      </button>
                      <span
                        className="help-tip__content help-tip__content--wide"
                        id="join-important-notice-tip"
                        role="tooltip"
                      >
                        We apply age rules based on your country. Users under legal age need a parent or guardian to
                        approve their account. Please enter the correct date of birth.
                      </span>
                    </span>
                  </div>
                  <div className="dob-row">
                    <select
                      ref={monthRef}
                      className="select"
                      id="landing-dob-month"
                      aria-label="Month"
                      value={month}
                      onChange={(event) => setMonth(event.target.value)}
                    >
                      {DOB_MONTHS.map((label, index) => (
                        <option key={label} value={String(index + 1)}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <select
                      className="select"
                      id="landing-dob-day"
                      aria-label="Day"
                      value={day}
                      onChange={(event) => setDay(event.target.value)}
                    >
                      {days.map((value) => (
                        <option key={value} value={String(value)}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <select
                      className="select"
                      id="landing-dob-year"
                      aria-label="Year"
                      value={year}
                      onChange={(event) => setYear(event.target.value)}
                    >
                      {years.map((value) => (
                        <option key={value} value={String(value)}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="field mt-6">
                  <label className="field-label" htmlFor="landing-country">
                    Country
                  </label>
                  <select
                    className="select"
                    id="landing-country"
                    aria-label="Country"
                    value={country}
                    onChange={(event) => {
                      const nextCountry = event.target.value;
                      setCountry(nextCountry);
                      if (nextCountry === "US") {
                        setRegion("California");
                      } else {
                        setRegion("");
                      }
                    }}
                  >
                    {COUNTRIES.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.flag} {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                {country === "US" ? (
                  <div className="field mt-6" id="landing-state-field">
                    <label className="field-label" htmlFor="landing-state">
                      State
                    </label>
                    <select
                      className="select"
                      id="landing-state"
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
                ) : null}

                {apiError ? (
                  <p className="field-error mt-4" role="alert">
                    {apiError}
                  </p>
                ) : null}

                <button type="submit" className="btn btn--primary mt-8" id="btn-landing-next" disabled={isSubmitting}>
                  <span className="btn__label">{isSubmitting ? "Saving…" : "Next"}</span>
                  <span className="btn__progress" aria-hidden="true">
                    <span className="btn__progress-bar" />
                  </span>
                </button>
              </form>
            </div>

            <div className={`auth-split__step verify-email${step === 3 ? " is-active" : ""}`} id="landing-step-3">
              <div className="auth-split__step-header" aria-hidden="true" />
              <h2 className="verify-email__title">Verify your email address</h2>
              <p className="subtitle mt-2 verify-email__subtitle">
                We have sent an email to you with an activation link.
              </p>
              <p className="verify-email__lead">Check your inbox @</p>
              <div className="verify-email__address" id="verify-email-display">
                <span className="help-tip verify-email__change-tip">
                  <button
                    type="button"
                    className="help-tip__trigger verify-email__change-btn"
                    id="btn-verify-email-change"
                    aria-label="Change email address"
                    onClick={handleChangeEmail}
                  >
                    <svg
                      className="help-tip__icon verify-email__change-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </span>
                <span className="verify-email__address-text" id="verify-email-display-text" title={emailTitle}>
                  {formattedEmail}
                </span>
              </div>

              <p className="verify-email__resend">
                Didn&apos;t get it?{" "}
                <button
                  type="button"
                  className="link-btn verify-email__resend-link"
                  id="btn-resend-verify-email"
                  onClick={handleResend}
                  disabled={cooldown > 0 || isResending}
                >
                  <svg
                    className="verify-email__resend-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M23 4v6h-6" />
                    <path d="M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  Resend email
                </button>
              </p>

              <div className={`resend-cooldown${cooldown > 0 ? "" : " hidden"}`} id="verify-resend-cooldown" aria-live="polite">
                <div
                  className="resend-progress"
                  id="verify-resend-progress"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={EMAIL_VERIFY_COOLDOWN_SECONDS}
                  aria-valuenow={EMAIL_VERIFY_COOLDOWN_SECONDS - cooldown}
                >
                  <div
                    className="resend-progress-bar"
                    id="verify-resend-progress-bar"
                    style={{ width: `${cooldownPercent}%` }}
                  />
                </div>
                <p className="resend-countdown" id="verify-resend-countdown">
                  Resend available in {cooldown}s
                </p>
              </div>

              <Disclosure label="What to look for" id="verify-email-info">
                <p className="verify-email__info-line">
                  <span>From :</span> hello@inrcliq.com
                </p>
                <p className="verify-email__info-line">
                  <span>Subject :</span> Verify your InrCliq account
                </p>
                <ul className="verify-email__info-list">
                  <li>Should arrive within 2 minutes. Check spam if you don&apos;t see it</li>
                  <li>The link active for next 24 hours.</li>
                </ul>
              </Disclosure>

              <p className="verify-email__security">
                <span className="verify-email__shield" aria-hidden="true">
                  🛡
                </span>
                We&apos;ll never ask for your password by email. This quick check just helps us make sure it&apos;s really
                you.
              </p>

              {apiError ? (
                <p className="field-error mt-4" role="alert">
                  {apiError}
                </p>
              ) : null}

              {process.env.NODE_ENV === "development" ? (
                <p className="verify-email__dev-note mt-6">
                  Check the server console for the verification link, or resend to log a new one.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
    <SignupProgressBar step={step} />
    </>
  );
}

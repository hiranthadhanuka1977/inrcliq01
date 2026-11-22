"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { PasswordOtpNoticeButton } from "@/components/feed/account/PasswordOtpNoticeButton";
import { getSignupPasswordFieldError, isPasswordRequirementMet } from "@/lib/form-validation";
import {
  clearPasswordOtpNotice,
  publishPasswordOtpNotice,
} from "@/lib/feed/password-otp-notice";

type Step = "send" | "code" | "password" | "done";
type Panel = "list" | "password";

const SETTING_GROUPS = [
  {
    id: "account",
    label: "Account",
    items: [
      { id: "email", label: "Email", detail: "Address used to sign in and receive codes" },
      { id: "password", label: "Password", detail: "Change the password for this account" },
    ],
  },
  {
    id: "privacy",
    label: "Privacy and safety",
    items: [
      { id: "privacy", label: "Privacy", detail: "Who can see your profile, posts, and activity" },
      { id: "blocked", label: "Blocked accounts", detail: "People you have blocked" },
    ],
  },
  {
    id: "notifications",
    label: "Notifications",
    items: [
      { id: "notifications", label: "Notifications", detail: "Follows, comments, bookings, and email alerts" },
      { id: "messages", label: "Messages", detail: "Who can message you" },
    ],
  },
  {
    id: "preferences",
    label: "Preferences",
    items: [
      { id: "appearance", label: "Appearance", detail: "Light or dark mode" },
      { id: "payments", label: "Payment methods", detail: "Cards and payouts for purchases and bookings" },
    ],
  },
] as const;

export default function AccountSettingsView({ email }: { email: string }) {
  const [panel, setPanel] = useState<Panel>("list");
  const [step, setStep] = useState<Step>("send");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requirementMet = isPasswordRequirementMet(password);

  async function sendCode() {
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/feed/me/password/otp", { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as { error?: string; code?: string; email?: string };
      if (!response.ok || !data.code || !data.email) {
        setError(data.error ?? "Unable to send the password code.");
        return;
      }
      publishPasswordOtpNotice({ code: data.code, email: data.email });
      setStep("code");
    } catch {
      setError("Unable to send the password code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function checkCode(event: FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/feed/me/password/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "That code is incorrect or has expired.");
        return;
      }
      setStep("password");
    } catch {
      setError("Unable to check the code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updatePassword(event: FormEvent) {
    event.preventDefault();
    setError("");
    const message = getSignupPasswordFieldError(password);
    if (message) {
      setError(message);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/feed/me/password/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, password, confirmPassword }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to update the password.");
        return;
      }
      clearPasswordOtpNotice();
      setStep("done");
    } catch {
      setError("Unable to update the password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="main-content account-profile" id="main">
      <div className="account-profile__card account-settings">
        {step !== "send" ? <PasswordOtpNoticeButton hiddenUntilNotice placement="corner" /> : null}
        <div className="account-settings__head">
          <div>
            <p className="account-profile__eyebrow">Account</p>
            <h1 className="account-profile__name">{panel === "password" ? "Password" : "Settings"}</h1>
          </div>
        </div>

        {panel === "list" ? (
          <div className="account-settings__groups">
            {SETTING_GROUPS.map((group) => (
              <section key={group.id} aria-labelledby={`settings-${group.id}`}>
                <h2 id={`settings-${group.id}`} className="account-settings__group-label">
                  {group.label}
                </h2>
                <ul className="account-settings__list">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      {item.id === "password" ? (
                        <button type="button" className="account-settings__item account-settings__item--action" onClick={() => setPanel("password")}>
                          <span className="account-settings__item-copy">
                            <span className="account-settings__item-label">{item.label}</span>
                            <span className="account-settings__item-detail">{item.detail}</span>
                          </span>
                          <svg className="account-settings__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="m9 18 6-6-6-6" />
                          </svg>
                        </button>
                      ) : (
                        <div className="account-settings__item">
                          <span className="account-settings__item-copy">
                            <span className="account-settings__item-label">{item.label}</span>
                            <span className="account-settings__item-detail">{item.detail}</span>
                          </span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : null}

        {panel === "password" ? (
        <section className="account-settings__section" aria-labelledby="change-password-title">
          <button type="button" className="account-settings__back" onClick={() => setPanel("list")}>
            All settings
          </button>
          <h2 id="change-password-title">Change password</h2>
          {step === "send" ? (
            <>
              <p>We email a one-time code to {email}. Open the notification to copy it.</p>
              {error ? (
                <p className="field-error" role="alert">
                  {error}
                </p>
              ) : null}
              <button type="button" className="btn btn--primary" onClick={() => void sendCode()} disabled={isSubmitting}>
                {isSubmitting ? "Sending…" : "Email me a code"}
              </button>
            </>
          ) : null}

          {step === "code" ? (
            <form onSubmit={(event) => void checkCode(event)}>
              <p>A code is in your notification. Enter it to choose a new password.</p>
              <div className="field">
                <label className="field-label" htmlFor="password-change-code">
                  One-time code
                </label>
                <input
                  className="input"
                  id="password-change-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={isSubmitting}
                />
              </div>
              {error ? (
                <p className="field-error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="account-settings__actions">
                <button type="submit" className="btn btn--primary" disabled={isSubmitting || code.length !== 6}>
                  {isSubmitting ? "Checking…" : "Continue"}
                </button>
                <button type="button" className="btn btn--secondary" onClick={() => void sendCode()} disabled={isSubmitting}>
                  Send again
                </button>
              </div>
            </form>
          ) : null}

          {step === "password" ? (
            <form onSubmit={(event) => void updatePassword(event)}>
              <p>Choose a new password for {email}.</p>
              <div className="field">
                <label className="field-label" htmlFor="password-change-new">
                  Password
                </label>
                <input
                  className="input"
                  id="password-change-new"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
              <p className={`password-requirement${requirementMet ? " is-met" : ""}`}>
                <span className="password-requirement__mark" aria-hidden="true" />
                <span>At least 8 characters, with letters and numbers</span>
              </p>
              <div className="field">
                <label className="field-label" htmlFor="password-change-confirm">
                  Retype password
                </label>
                <input
                  className="input"
                  id="password-change-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
              {error ? (
                <p className="field-error" role="alert">
                  {error}
                </p>
              ) : null}
              <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
                {isSubmitting ? "Updating…" : "Confirm"}
              </button>
            </form>
          ) : null}

          {step === "done" ? <p>Your password is updated. Use it the next time you sign in.</p> : null}
        </section>
        ) : null}

        <div className="account-profile__actions">
          <Link href="/feed/me" className="btn btn--secondary">
            Back to profile
          </Link>
        </div>
      </div>
    </main>
  );
}

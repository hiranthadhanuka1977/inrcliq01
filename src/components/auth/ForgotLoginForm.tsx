"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { getEmailValidationError } from "@/lib/form-validation";
import { FieldError } from "@/components/ui/FieldError";

const LOGIN_CODE_KEY = "inrcliq_login_code";
const LOGIN_CODE_EMAIL_KEY = "inrcliq_login_code_email";

export function ForgotLoginForm() {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState({ visible: false, message: "" });
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  function clearEmailErrors() {
    setEmailError({ visible: false, message: "" });
  }

  function setEmailFieldError(message: string) {
    setEmailError({ visible: true, message });
  }

  function updateEmailErrorsOnInput(value: string) {
    if (!emailError.visible) return;
    const message = getEmailValidationError(value);
    if (message) setEmailFieldError(message);
    else clearEmailErrors();
  }

  function validateEmailField() {
    const message = getEmailValidationError(email);
    clearEmailErrors();
    if (message) {
      setEmailFieldError(message);
      emailRef.current?.focus();
      return false;
    }
    return true;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validateEmailField()) return;

    setIsSending(true);

    try {
      const response = await fetch("/api/auth/login/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429 && data.cooldownRemaining) {
          sessionStorage.setItem(LOGIN_CODE_EMAIL_KEY, email.trim().toLowerCase());
          router.push("/");
          return;
        }
        setEmailFieldError(data.error ?? "Unable to send login code.");
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (data.loginCode) {
        sessionStorage.setItem(LOGIN_CODE_KEY, data.loginCode);
        sessionStorage.setItem(LOGIN_CODE_EMAIL_KEY, normalizedEmail);
      }

      router.push("/");
    } catch {
      setEmailFieldError("Unable to send login code.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <Link href="/" className="back-btn auth-split__back" aria-label="Back to log in">
        ←
      </Link>
      <h1>Forgot your login details?</h1>
      <p className="subtitle mt-2">
        Enter the email on your account and we&apos;ll send you a login code so you can get back in.
      </p>

      <form className="gap-3 mt-8" onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label" htmlFor="forgot-login-email">
            Email
          </label>
          <input
            ref={emailRef}
            className={`input${emailError.visible ? " input--error" : ""}`}
            type="email"
            id="forgot-login-email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              updateEmailErrorsOnInput(event.target.value);
            }}
            autoComplete="email"
            placeholder="you@example.com"
            aria-describedby="forgot-login-email-error"
            aria-invalid={emailError.visible}
          />
          <FieldError
            id="forgot-login-email-error"
            message={emailError.message}
            hidden={!emailError.visible}
            defaultMessage="Please enter a valid email address."
          />
        </div>

        <button type="submit" className="btn btn--primary" disabled={isSending}>
          <span className="btn__label">{isSending ? "Sending…" : "Send login code"}</span>
        </button>
      </form>

      <p className="auth-switch mt-8">
        Remember your details?{" "}
        <Link href="/" className="link-btn">
          Back to log in
        </Link>
      </p>
    </>
  );
}

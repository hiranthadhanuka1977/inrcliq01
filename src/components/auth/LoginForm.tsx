"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { LOGIN_CODE_COOLDOWN_SECONDS } from "@/lib/auth/login-code.constants";
import { getEmailValidationError } from "@/lib/form-validation";
import { FieldError } from "@/components/ui/FieldError";

const GoogleIcon = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const AppleIcon = () => (
  <svg className="btn-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

type Step = "email" | "otp";

export function LoginForm() {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [emailError, setEmailError] = useState({ visible: false, message: "" });
  const [otpError, setOtpError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showSendAgain, setShowSendAgain] = useState(false);
  const isLoggingInRef = useRef(false);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    if (step !== "otp") return;

    const timer = window.setTimeout(() => {
      otpRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (cooldown <= 0) {
      if (step === "otp") setShowSendAgain(true);
      return;
    }

    setShowSendAgain(false);
    const timer = window.setInterval(() => {
      setCooldown((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown, step]);

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

  const sendCode = useCallback(async () => {
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
          setCooldown(data.cooldownRemaining);
          setStep("otp");
          return;
        }
        setEmailFieldError(data.error ?? "Unable to send login code.");
        return;
      }

      setStep("otp");
      setOtp("");
      setCooldown(data.cooldownRemaining ?? LOGIN_CODE_COOLDOWN_SECONDS);
      setShowSendAgain(false);

      if (data.devCode) {
        console.info(`Dev login code: ${data.devCode}`);
      }
    } catch {
      setEmailFieldError("Unable to send login code.");
    } finally {
      setIsSending(false);
    }
  }, [email]);

  const verifyOtp = useCallback(
    async (code: string) => {
      if (code.length !== 6 || isLoggingInRef.current) return;

      isLoggingInRef.current = true;
      setOtpError("");
      setIsLoggingIn(true);

      try {
        const response = await fetch("/api/auth/login/verify-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code }),
        });

        const data = await response.json();

        if (!response.ok) {
          setOtpError(data.error ?? "Invalid or expired code.");
          return;
        }

        router.push(data.redirectTo ?? "/home");
        router.refresh();
      } catch {
        setOtpError("Unable to log in.");
      } finally {
        isLoggingInRef.current = false;
        setIsLoggingIn(false);
      }
    },
    [email, router],
  );

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();
    await sendCode();
  }

  async function handleOtpSubmit(event: FormEvent) {
    event.preventDefault();
    await verifyOtp(otp);
  }

  async function handleSendAgain() {
    setOtp("");
    setShowSendAgain(false);
    await sendCode();
  }

  const isOtpComplete = otp.length === 6;
  const cooldownPercent =
    cooldown > 0
      ? Math.min(100, ((LOGIN_CODE_COOLDOWN_SECONDS - cooldown) / LOGIN_CODE_COOLDOWN_SECONDS) * 100)
      : 0;

  return (
    <>
      <div className="gap-3 mt-8">
        <button type="button" className="btn btn--secondary btn-login-oauth" disabled>
          <GoogleIcon />
          Continue with Google
        </button>
        <button type="button" className="btn btn--dark btn-login-oauth" disabled>
          <AppleIcon />
          Continue with Apple
        </button>
        <div className="divider">or</div>

        <div id="login-email-step" className={`gap-3${step === "otp" ? " hidden" : ""}`}>
          <form className="gap-3" onSubmit={handleEmailSubmit}>
            <div className="field">
              <label className="field-label" htmlFor="login-email">
                Email
              </label>
              <input
                ref={emailRef}
                className={`input${emailError.visible ? " input--error" : ""}`}
                type="email"
                id="login-email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  updateEmailErrorsOnInput(event.target.value);
                }}
                autoComplete="email"
                placeholder="you@example.com"
                aria-describedby="login-email-error"
                aria-invalid={emailError.visible}
              />
              <FieldError
                id="login-email-error"
                message={emailError.message}
                hidden={!emailError.visible}
                defaultMessage="Please enter a valid email address."
              />
            </div>
            <button type="submit" className="btn btn--primary" disabled={isSending}>
              <span className="btn__label">{isSending ? "Sending…" : "Send login code"}</span>
            </button>
          </form>
        </div>

        <div id="login-otp-step" className={`gap-3${step === "email" ? " hidden" : ""}`}>
          <form className="gap-3" onSubmit={handleOtpSubmit}>
            <div className="field">
              <label className="field-label" htmlFor="login-otp">
                Enter 6-digit code
              </label>
              <div className="otp-input-group" id="login-otp-input-wrap">
                <input
                  ref={otpRef}
                  className="input otp-input otp-input-group__input"
                  type="text"
                  id="login-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(event) => {
                    const nextOtp = event.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtp(nextOtp);
                    if (nextOtp.length === 6) {
                      void verifyOtp(nextOtp);
                    }
                  }}
                />
                <button
                  type="button"
                  className={`otp-input-group__action input-with-action__btn--link${showSendAgain ? "" : " hidden"}`}
                  id="btn-login-code-send-again"
                  onClick={handleSendAgain}
                >
                  Send again
                </button>
              </div>
              {otpError ? (
                <p className="field-error" role="alert">
                  {otpError}
                </p>
              ) : null}
            </div>

            <div className={`resend-cooldown${cooldown > 0 ? "" : " hidden"}`} id="login-code-cooldown" aria-live="polite">
              <div
                className="resend-progress"
                id="login-code-progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={LOGIN_CODE_COOLDOWN_SECONDS}
                aria-valuenow={LOGIN_CODE_COOLDOWN_SECONDS - cooldown}
              >
                <div
                  className="resend-progress-bar"
                  id="login-code-progress-bar"
                  style={{ width: `${cooldownPercent}%` }}
                />
              </div>
              <p className="resend-countdown" id="login-code-countdown">
                Send again in {cooldown}s
              </p>
            </div>

            <button
              type="submit"
              className="btn btn--primary"
              id="btn-login-otp"
              disabled={!isOtpComplete || isLoggingIn}
              aria-disabled={!isOtpComplete || isLoggingIn}
            >
              <span className="btn__label">{isLoggingIn ? "Logging in…" : "Log in"}</span>
            </button>
          </form>
        </div>
      </div>

      <p className="auth-switch mt-8">
        New here?{" "}
        <Link href="/signup" className="link-btn">
          Sign up
        </Link>
      </p>
    </>
  );
}

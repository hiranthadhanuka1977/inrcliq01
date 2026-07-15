"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { LOGIN_CODE_COOLDOWN_SECONDS } from "@/lib/auth/login-code.constants";
import { getEmailValidationError } from "@/lib/form-validation";
import { FieldError } from "@/components/ui/FieldError";
import { LoginCodeInbox } from "@/components/auth/LoginCodeInbox";

const LOGIN_CODE_KEY = "inrcliq_login_code";
const LOGIN_CODE_EMAIL_KEY = "inrcliq_login_code_email";

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

const PasswordLoginIcon = () => (
  <svg
    className="login-method-switch__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CodeLoginIcon = () => (
  <svg
    className="login-method-switch__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

type Step = "email" | "otp";
type LoginMethod = "code" | "password";

export function LoginForm() {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [loginMethod, setLoginMethod] = useState<LoginMethod>("code");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState({ visible: false, message: "" });
  const [otpError, setOtpError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showSendAgain, setShowSendAgain] = useState(false);
  const [loginCode, setLoginCode] = useState("");
  const [inboxOpen, setInboxOpen] = useState(false);
  const isLoggingInRef = useRef(false);

  useEffect(() => {
    const savedCode = sessionStorage.getItem(LOGIN_CODE_KEY);
    const savedEmail = sessionStorage.getItem(LOGIN_CODE_EMAIL_KEY);
    if (savedCode && savedEmail) {
      setEmail(savedEmail);
      setLoginCode(savedCode);
      setStep("otp");
    }
  }, []);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    if (loginMethod !== "password") return;

    const timer = window.setTimeout(() => {
      passwordRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loginMethod]);

  useEffect(() => {
    if (step !== "otp" || loginMethod !== "code") return;

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
  }, [cooldown, step, loginMethod]);

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

  function persistLoginCode(code: string, normalizedEmail: string) {
    setLoginCode(code);
    sessionStorage.setItem(LOGIN_CODE_KEY, code);
    sessionStorage.setItem(LOGIN_CODE_EMAIL_KEY, normalizedEmail);
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

      if (data.loginCode) {
        persistLoginCode(data.loginCode, email.trim().toLowerCase());
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

        sessionStorage.removeItem(LOGIN_CODE_KEY);
        sessionStorage.removeItem(LOGIN_CODE_EMAIL_KEY);

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

  function switchToPasswordLogin() {
    setLoginMethod("password");
    setInboxOpen(false);
    setOtpError("");
    setPasswordError("");
    clearEmailErrors();
  }

  function switchToCodeLogin() {
    setLoginMethod("code");
    setPasswordError("");
    setPassword("");
    setShowPassword(false);
    clearEmailErrors();
    window.setTimeout(() => emailRef.current?.focus(), 0);
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validateEmailField()) return;

    if (!password.trim()) {
      setPasswordError("Please enter your password.");
      passwordRef.current?.focus();
      return;
    }

    setPasswordError("");
    setIsLoggingIn(true);

    try {
      const response = await fetch("/api/auth/login/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordError(data.error ?? "Unable to log in.");
        return;
      }

      sessionStorage.removeItem(LOGIN_CODE_KEY);
      sessionStorage.removeItem(LOGIN_CODE_EMAIL_KEY);

      router.push(data.redirectTo ?? "/home");
      router.refresh();
    } catch {
      setPasswordError("Unable to log in.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  const usePasswordLink = (
    <p className="login-method-switch">
      <button
        type="button"
        className="link-btn login-method-switch__link"
        id="link-use-password-login"
        onClick={switchToPasswordLogin}
      >
        <PasswordLoginIcon />
        Use password to login
      </button>
    </p>
  );

  const useCodeLink = (
    <p className="login-method-switch">
      <button
        type="button"
        className="link-btn login-method-switch__link"
        id="link-use-code-login"
        onClick={switchToCodeLogin}
      >
        <CodeLoginIcon />
        Use login code instead
      </button>
    </p>
  );

  const forgotLoginLink = (
    <p className="auth-forgot-link">
      <Link href="/forgot-login" className="link-btn" id="link-forgot-login-details">
        Forgot login details?
      </Link>
    </p>
  );

  const isOtpComplete = otp.length === 6;
  const cooldownPercent =
    cooldown > 0
      ? Math.min(100, ((LOGIN_CODE_COOLDOWN_SECONDS - cooldown) / LOGIN_CODE_COOLDOWN_SECONDS) * 100)
      : 0;

  return (
    <>
      {step === "otp" && loginMethod === "code" && loginCode ? (
        <button
          type="button"
          className="verify-email__inbox-btn"
          id="btn-open-login-code-inbox"
          aria-label="Open login code email"
          aria-expanded={inboxOpen}
          onClick={() => setInboxOpen(true)}
        >
          <svg
            className="verify-email__inbox-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          <span className="verify-email__inbox-badge" aria-hidden="true" />
        </button>
      ) : null}

      <LoginCodeInbox
        open={inboxOpen}
        email={email}
        loginCode={loginCode}
        onClose={() => setInboxOpen(false)}
      />

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

        <div id="login-email-step" className={`gap-3${step === "otp" || loginMethod === "password" ? " hidden" : ""}`}>
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
            {forgotLoginLink}
            {usePasswordLink}
          </form>
        </div>

        <div id="login-otp-step" className={`gap-3${step === "email" || loginMethod === "password" ? " hidden" : ""}`}>
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
            {usePasswordLink}
          </form>
        </div>

        <div id="login-password-step" className={`gap-3${loginMethod === "password" ? "" : " hidden"}`}>
          <form className="gap-3" onSubmit={handlePasswordSubmit}>
            <div className="field">
              <label className="field-label" htmlFor="login-password-email">
                Email
              </label>
              <input
                className={`input${emailError.visible ? " input--error" : ""}`}
                type="email"
                id="login-password-email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  updateEmailErrorsOnInput(event.target.value);
                }}
                autoComplete="email"
                placeholder="you@example.com"
                aria-describedby="login-password-email-error"
                aria-invalid={emailError.visible}
              />
              <FieldError
                id="login-password-email-error"
                message={emailError.message}
                hidden={!emailError.visible}
                defaultMessage="Please enter a valid email address."
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="login-password">
                Password
              </label>
              <div className="input-with-action">
                <input
                  ref={passwordRef}
                  className="input"
                  type={showPassword ? "text" : "password"}
                  id="login-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  aria-describedby="login-password-error"
                />
                <button
                  type="button"
                  className="input-with-action__btn"
                  id="btn-login-password-toggle"
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
              {passwordError ? (
                <p className="field-error" id="login-password-error" role="alert">
                  {passwordError}
                </p>
              ) : null}
            </div>

            <button type="submit" className="btn btn--primary" id="btn-login-password" disabled={isLoggingIn}>
              <span className="btn__label">{isLoggingIn ? "Logging in…" : "Log in"}</span>
            </button>
            {forgotLoginLink}
            {useCodeLink}
          </form>
        </div>
      </div>
    </>
  );
}

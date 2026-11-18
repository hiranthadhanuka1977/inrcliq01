"use client";

import { useState } from "react";
import { AuthPathShell } from "@/components/auth/AuthPathShell";
import { AuthTopbar } from "@/components/auth/AuthTopbar";
import ThemeSwitcher from "@/components/feed/ThemeSwitcher";
import { GuardianLoginModal } from "@/components/guardian/GuardianModals";
import { ParentStepper } from "@/components/guardian/ParentStepper";

export function ParentSignupLayout({
  stepperStep,
  completeCurrentStep = false,
  single = false,
  protection = false,
  screenId,
  children,
  sidebar,
  onLoginSuccess,
  loginEmail,
  loggedInAccount,
  onLogout,
  isLoggingOut = false,
}: {
  stepperStep: number;
  completeCurrentStep?: boolean;
  single?: boolean;
  protection?: boolean;
  screenId?: string;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  onLoginSuccess?: (sessionToken: string) => void | Promise<void>;
  loginEmail?: string;
  loggedInAccount?: { name: string | null; email: string } | null;
  onLogout?: () => void | Promise<void>;
  isLoggingOut?: boolean;
}) {
  const [loginOpen, setLoginOpen] = useState(false);

  const sectionClass = [
    "screen",
    "parent-signup",
    single ? "parent-signup--single parent-signup--stepper-width" : "",
    protection ? "parent-signup--protection" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const layoutClass = [
    "parent-signup__layout",
    single ? "parent-signup__layout--single" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <AuthPathShell showTopLogo>
      <div className="app-shell">
        <div className="app-frame">
          <section className={sectionClass} id={screenId}>
            <AuthTopbar>
              {loggedInAccount ? (
                <p className="auth-topbar__account">
                  <span>
                    Logged in as{" "}
                    <span className="auth-topbar__account-name">
                      {loggedInAccount.name?.trim() || loggedInAccount.email}
                    </span>
                  </span>
                  {loggedInAccount.name?.trim() ? (
                    <>
                      <span className="auth-topbar__account-sep" aria-hidden="true">
                        ·
                      </span>
                      <span className="auth-topbar__account-email">{loggedInAccount.email}</span>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => void onLogout?.()}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? "Logging out…" : "Log out"}
                  </button>
                </p>
              ) : (
                <p className="auth-topbar__prompt-text">
                  Already have an account?{" "}
                  <button type="button" className="link-btn" onClick={() => setLoginOpen(true)}>
                    Log in
                  </button>
                </p>
              )}
              <ThemeSwitcher />
            </AuthTopbar>

            <div className="parent-signup__progress">
              <ParentStepper currentStep={stepperStep} completeCurrent={completeCurrentStep} />
              <hr className="parent-signup__progress-divider" />
            </div>

            <div className="parent-signup__shell">
              <div className={layoutClass}>
                <div className="parent-signup__main">{children}</div>
                {sidebar}
              </div>
            </div>
          </section>
        </div>
      </div>
      <GuardianLoginModal
        open={loginOpen}
        parentEmail={loginEmail}
        onClose={() => setLoginOpen(false)}
        onSuccess={async (sessionToken) => {
          if (onLoginSuccess) {
            await onLoginSuccess(sessionToken);
          }
        }}
      />
    </AuthPathShell>
  );
}

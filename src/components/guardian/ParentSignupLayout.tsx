"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ParentStepper } from "@/components/guardian/ParentStepper";

export function ParentSignupLayout({
  stepperStep,
  completeCurrentStep = false,
  single = false,
  protection = false,
  screenId,
  children,
  sidebar,
}: {
  stepperStep: number;
  completeCurrentStep?: boolean;
  single?: boolean;
  protection?: boolean;
  screenId?: string;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}) {
  const router = useRouter();

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
    <div className="app-shell">
      <div className="app-frame">
        <section className={sectionClass} id={screenId}>
          <header className="parent-signup__topbar">
            <Link href="/" className="logo logo--img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/logo-InrCliq.svg"
                alt="InrCliq"
                className="logo__img"
                width={114}
                height={27}
              />
            </Link>
            <p className="parent-signup__login-prompt">
              Already have an account?{" "}
              <button type="button" className="link-btn" onClick={() => router.push("/")}>
                Log in
              </button>
            </p>
          </header>

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
  );
}

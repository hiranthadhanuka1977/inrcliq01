import { SignupProgressBar } from "@/components/auth/SignupProgressBar";

export function AuthCenterLayout({
  children,
  signupStep = false,
  cardClassName = "",
  progressStep,
  screenId,
}: {
  children: React.ReactNode;
  signupStep?: boolean;
  cardClassName?: string;
  progressStep?: number;
  screenId?: string;
}) {
  const cardClasses = ["auth-center__card", cardClassName].filter(Boolean).join(" ");

  return (
    <>
      <section
        id={screenId}
        className={`auth-center${signupStep ? " auth-center--signup-step" : ""}`}
      >
        <div className={cardClasses}>{children}</div>
      </section>
      {progressStep !== undefined ? <SignupProgressBar step={progressStep} /> : null}
    </>
  );
}

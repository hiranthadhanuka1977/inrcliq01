import { SignupProgressBar } from "@/components/auth/SignupProgressBar";
import { AuthPathShell } from "@/components/auth/AuthPathShell";
import ThemeSwitcher from "@/components/feed/ThemeSwitcher";

export function AuthCenterLayout({
  children,
  signupStep = false,
  cardClassName = "",
  progressStep,
  screenId,
  showTopLogo = true,
}: {
  children: React.ReactNode;
  signupStep?: boolean;
  cardClassName?: string;
  progressStep?: number;
  screenId?: string;
  showTopLogo?: boolean;
}) {
  const cardClasses = ["auth-center__card", cardClassName].filter(Boolean).join(" ");

  return (
    <AuthPathShell showTopLogo={showTopLogo}>
      <ThemeSwitcher className="theme-switcher--auth-fixed" />
      <section
        id={screenId}
        className={`auth-center${signupStep ? " auth-center--signup-step" : ""}`}
      >
        <div className={cardClasses}>{children}</div>
      </section>
      {progressStep !== undefined ? <SignupProgressBar step={progressStep} /> : null}
    </AuthPathShell>
  );
}

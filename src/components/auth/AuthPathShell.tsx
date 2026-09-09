import { AuthTopLogo } from "@/components/auth/AuthTopLogo";
import { PrototypeControls } from "@/components/prototype/PrototypeControls";

/** Marks auth/onboarding trees so shared theme tokens apply. */
export function AuthPathShell({
  children,
  showTopLogo = false,
}: {
  children: React.ReactNode;
  showTopLogo?: boolean;
}) {
  return (
    <div className={`auth-path-shell${showTopLogo ? " auth-path-shell--top-logo" : ""}`}>
      <PrototypeControls />
      {showTopLogo ? <AuthTopLogo /> : null}
      {children}
    </div>
  );
}

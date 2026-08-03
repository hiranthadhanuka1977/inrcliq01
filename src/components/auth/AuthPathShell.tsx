/** Marks auth/onboarding trees so shared theme tokens apply. */
export function AuthPathShell({ children }: { children: React.ReactNode }) {
  return <div className="auth-path-shell">{children}</div>;
}

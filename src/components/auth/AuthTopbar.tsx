export function AuthTopbar({ children }: { children: React.ReactNode }) {
  return (
    <header className="auth-topbar">
      <div className="auth-topbar__actions">{children}</div>
    </header>
  );
}

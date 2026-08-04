import { AuthPathShell } from "@/components/auth/AuthPathShell";
import ThemeSwitcher from "@/components/feed/ThemeSwitcher";

export function AuthPageCentered({
  children,
  innerClassName = "",
  showTopLogo = true,
}: {
  children: React.ReactNode;
  innerClassName?: string;
  showTopLogo?: boolean;
}) {
  const innerClasses = ["page-centered__inner", innerClassName].filter(Boolean).join(" ");

  return (
    <AuthPathShell showTopLogo={showTopLogo}>
      <ThemeSwitcher className="theme-switcher--auth-fixed" />
      <section className="page-centered">
        <div className={innerClasses}>{children}</div>
      </section>
    </AuthPathShell>
  );
}

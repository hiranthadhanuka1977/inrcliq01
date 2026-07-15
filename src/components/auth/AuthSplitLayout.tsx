import Link from "next/link";

export function AuthSplitLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="auth-split">
      <header className="auth-split__topbar">
        <div className="auth-split__signup-prompt">
          <span className="auth-split__signup-prompt-text">New here?</span>
          <Link href="/signup" className="btn btn--outline-brand btn--xs">
            Create a free account
          </Link>
        </div>
      </header>

      <aside className="auth-split__marketing" aria-label="About InrCliq">
        <div className="auth-split__illustration" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/landing-illustration.svg" alt="" width={440} height={320} decoding="async" />
        </div>
        <Link href="/" className="logo logo--img logo--inverse">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo-InrCliq.svg"
            alt="InrCliq"
            className="logo__img logo__img--inverse"
            width={114}
            height={27}
          />
        </Link>
        <h1 className="auth-split__headline">Unlock Exclusive Content from Top Creators</h1>
        <p className="auth-split__tagline">
          Discover premium videos, live sessions, and more from top creators in fitness, cooking, music, and beyond.
        </p>
      </aside>

      <div className="auth-split__auth">
        <div className="auth-split__auth-inner">
        <Link href="/" className="logo logo--img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo-InrCliq.svg" alt="InrCliq" className="logo__img" width={114} height={27} />
        </Link>
          <h2>{title}</h2>
          <p className="subtitle mt-2">{subtitle}</p>
          {children}
        </div>
      </div>

      <p className="auth-split__copyright">&copy; 2026 InrCliq. All rights reserved.</p>
    </section>
  );
}

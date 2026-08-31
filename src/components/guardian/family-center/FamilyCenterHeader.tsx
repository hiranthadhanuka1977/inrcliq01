import Link from "next/link";

export function FamilyCenterHeader({ showActivityDot = false }: { showActivityDot?: boolean }) {
  return (
    <header className="family-portal-header">
      <div className="family-portal-header__inner">
        <div className="family-portal-header__brand-group">
          <Link href="/family-circle" className="family-portal-header__brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/logo-InrCliq.svg"
              alt="InrCliq"
              className="logo__img"
              width={114}
              height={27}
            />
            <span className="family-portal-header__portal">Family Circle</span>
          </Link>
          <Link
            href="/family-circle/activity"
            className="family-portal-header__activity"
            aria-label="Family activity history"
            title="Activity"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            {showActivityDot ? (
              <span className="family-portal-header__activity-dot" aria-hidden="true" />
            ) : null}
          </Link>
        </div>
        <div className="family-portal-header__actions">
          <Link href="/feed" className="family-portal-header__back">
            <span className="family-portal-header__back-full">← Back to feed</span>
            <span className="family-portal-header__back-short">← Feed</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

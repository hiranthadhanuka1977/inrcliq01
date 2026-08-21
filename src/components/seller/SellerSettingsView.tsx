import Link from "next/link";

type SellerSettingsViewProps = {
  displayName: string;
  hasSpecialRequests: boolean;
};

export function SellerSettingsView({
  displayName,
  hasSpecialRequests,
}: SellerSettingsViewProps) {
  return (
    <div className="seller-panel">
      <header className="seller-panel__head">
        <h1 className="seller-panel__title">Settings</h1>
        <p className="seller-panel__subtitle">
          Manage how {displayName.split(" ")[0] || "you"} show up as a verified seller across
          INRCLIQ.
        </p>
      </header>

      <ul className="seller-settings-list">
        <li>
          <Link href="/seller/settings/public-profile" className="seller-settings-card">
            <span className="seller-settings-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="8.5" cy="11.5" r="1.5" />
                <path d="m21 15-4.5-4.5L9 18" />
              </svg>
            </span>
            <span className="seller-settings-card__copy">
              <strong>Personalise public profile</strong>
              <span>Change the top background banner fans see on your public profile.</span>
            </span>
          </Link>
        </li>
        <li>
          <Link href="/seller/collection?tab=setup" className="seller-settings-card">
            <span className="seller-settings-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </span>
            <span className="seller-settings-card__copy">
              <strong>Collection setup</strong>
              <span>Control storefront title, visibility, and product listing basics.</span>
            </span>
          </Link>
        </li>
        {hasSpecialRequests ? (
          <li>
            <Link href="/seller/service-requests" className="seller-settings-card">
              <span className="seller-settings-card__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <span className="seller-settings-card__copy">
                <strong>Service request tools</strong>
                <span>Manage offerings, booking calendar, and inbound requests.</span>
              </span>
            </Link>
          </li>
        ) : null}
        <li>
          <Link href="/feed/me?tab=subscriptions" className="seller-settings-card">
            <span className="seller-settings-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </span>
            <span className="seller-settings-card__copy">
              <strong>Account</strong>
              <span>Open your account page for followers, subscriptions, and profile photo.</span>
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}

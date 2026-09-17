import Link from "next/link";

export function SellerHeader() {
  return (
    <header className="seller-header">
      <div className="seller-header__inner">
        <Link href="/seller" className="seller-header__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo-InrCliq.svg"
            alt="InrCliq"
            className="logo__img"
            width={114}
            height={27}
          />
          <span className="seller-header__portal">Seller Tools</span>
        </Link>
        <div className="seller-header__actions">
          <Link href="/feed" className="seller-header__back">
            <span className="seller-header__back-long">← Back to feed</span>
            <span className="seller-header__back-short">← Feed</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

import Link from "next/link";

export function SettingsHeader() {
  return (
    <header className="settings-header">
      <div className="settings-header__inner">
        <Link href="/settings/users" className="logo logo--img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo-InrCliq.svg"
            alt="InrCliq"
            className="logo__img"
            width={114}
            height={27}
          />
        </Link>
      </div>
    </header>
  );
}

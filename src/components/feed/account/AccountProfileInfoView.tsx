import Link from "next/link";
import type { AccountProfile } from "@/lib/feed/account-profile";

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="account-profile__field">
      <dt className="account-profile__label">{label}</dt>
      <dd className="account-profile__value">{value}</dd>
    </div>
  );
}

export default function AccountProfileInfoView({ profile }: { profile: AccountProfile }) {
  return (
    <main className="main-content account-profile" id="main">
      <div className="account-profile__card">
        <div className="account-profile__info-header">
          <div>
            <p className="account-profile__eyebrow">Account</p>
            <h1 className="account-profile__name">Profile information</h1>
            <p className="account-profile__handle">
              Basic details for {profile.handle ? `@${profile.handle}` : profile.fullName}
            </p>
          </div>
          <span className="account-profile__avatar account-profile__avatar--sm" aria-hidden="true">
            {profile.avatarInitial}
          </span>
        </div>

        <section className="account-profile__section" aria-labelledby="account-profile-basics">
          <h2 id="account-profile-basics" className="account-profile__section-title">
            Basic information
          </h2>
          <dl className="account-profile__grid">
            <ProfileField label="Full name" value={profile.fullName} />
            <ProfileField
              label="Handle"
              value={profile.handle ? `@${profile.handle}` : "Not set"}
            />
            <ProfileField label="Email" value={profile.email} />
            <ProfileField
              label="Email status"
              value={profile.emailVerified ? "Verified" : "Not verified"}
            />
            <ProfileField
              label="Date of birth"
              value={
                profile.dateOfBirth
                  ? `${profile.dateOfBirth}${profile.age != null ? ` (${profile.age})` : ""}`
                  : "Not provided"
              }
            />
            <ProfileField label="Location" value={profile.locationLabel ?? "Not provided"} />
            <ProfileField label="Member since" value={profile.memberSince} />
            <ProfileField label="Account type" value={profile.accountTypeLabel} />
          </dl>
        </section>

        <section className="account-profile__section" aria-labelledby="account-profile-privacy">
          <h2 id="account-profile-privacy" className="account-profile__section-title">
            Privacy tier
          </h2>
          <div className="account-profile__privacy">
            <p className="account-profile__privacy-tier">{profile.privacyTierLabel}</p>
            <p className="account-profile__privacy-desc">{profile.privacyTierDescription}</p>
          </div>
        </section>

        <div className="account-profile__actions">
          <Link href="/feed/me" className="btn btn--secondary">
            Back to profile
          </Link>
        </div>
      </div>
    </main>
  );
}

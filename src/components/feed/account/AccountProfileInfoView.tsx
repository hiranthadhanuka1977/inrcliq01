import Link from "next/link";
import AccountProfileAvatar from "@/components/feed/account/AccountProfileAvatar";
import type { AccountProfile } from "@/lib/feed/account-profile";

function bareHandle(handle: string | null | undefined) {
  const trimmed = handle?.trim().replace(/^@/, "") ?? "";
  return trimmed || null;
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="account-profile__field">
      <dt className="account-profile__label">{label}</dt>
      <dd className="account-profile__value">{value}</dd>
    </div>
  );
}

export default function AccountProfileInfoView({
  profile,
  emailUpdated = false,
}: {
  profile: AccountProfile;
  emailUpdated?: boolean;
}) {
  const handle = bareHandle(profile.handle);

  return (
    <main className="main-content account-profile" id="main">
      <div className="account-profile__card">
        <div className="account-profile__info-header">
          <div>
            <p className="account-profile__eyebrow">Account</p>
            <h1 className="account-profile__name">Profile information</h1>
            <p className="account-profile__handle">
              Basic details for {handle ? `@${handle}` : profile.fullName}
            </p>
          </div>
          <AccountProfileAvatar
            avatarUrl={profile.avatarUrl}
            avatarColor={profile.avatarColor}
            avatarInitial={profile.avatarInitial}
            size="sm"
          />
        </div>

        <section className="account-profile__section" aria-labelledby="account-profile-basics">
          <h2 id="account-profile-basics" className="account-profile__section-title">
            Basic information
          </h2>
          <dl className="account-profile__grid">
            <div className="account-profile__field">
              <dt className="account-profile__label">Full name</dt>
              <dd className="account-profile__value account-profile__value--handle">
                <span>{profile.fullName}</span>
                <Link
                  href="/feed/me/edit/name"
                  className="account-profile__handle-edit"
                  aria-label="Change full name"
                  title="Change full name"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                  </svg>
                </Link>
              </dd>
            </div>
            <div className="account-profile__field">
              <dt className="account-profile__label">Handle</dt>
              <dd className="account-profile__value account-profile__value--handle">
                <span>{handle ? `@${handle}` : "Not set"}</span>
                <Link
                  href="/feed/me/edit/handle"
                  className="account-profile__handle-edit"
                  aria-label={handle ? "Change handle" : "Set handle"}
                  title={handle ? "Change handle" : "Set handle"}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                  </svg>
                </Link>
              </dd>
            </div>
            <div className="account-profile__field">
              <dt className="account-profile__label">Email</dt>
              <dd className="account-profile__value account-profile__value--handle">
                <span>{profile.email}</span>
                <Link
                  href="/feed/me/edit/email"
                  className="account-profile__handle-edit"
                  aria-label="Change email"
                  title="Change email"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                  </svg>
                </Link>
              </dd>
            </div>
            <ProfileField
              label="Email status"
              value={profile.emailVerified ? "Verified" : "Not verified"}
            />
            <ProfileField label="Date of birth" value={profile.dateOfBirth ?? "Not provided"} />
            <ProfileField
              label="Age"
              value={profile.age != null ? `${profile.age} years` : "Not provided"}
            />
            <ProfileField label="Location" value={profile.locationLabel ?? "Not provided"} />
            <ProfileField label="Member since" value={profile.memberSince} />
          </dl>
          <section className="account-profile__account-type" aria-labelledby="account-profile-type">
            <h3 id="account-profile-type" className="account-profile__label">
              Account type
            </h3>
            <div className="account-profile__account-type-row">
              <span className="account-profile__type-line">
                <span className="account-profile__chip">{profile.accountTypeLabel}</span>
                {profile.accountType === "ADULT" && !profile.identityVerified ? (
                  <span className="account-profile__chip">Not-verified</span>
                ) : null}
              </span>
              {profile.accountType === "ADULT" && !profile.identityVerified ? (
                <button type="button" className="account-profile__confirm-adult">
                  Confirm you are an Adult
                </button>
              ) : null}
            </div>
          </section>
          {emailUpdated ? (
            <p className="account-profile__notice" role="status">
              Your email address is updated.
            </p>
          ) : null}
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

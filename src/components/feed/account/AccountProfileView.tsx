"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import FollowButton from "@/components/feed/FollowButton";
import type {
  AccountProfile,
  AccountSocialPerson,
  AccountSocialTab,
} from "@/lib/feed/account-profile";

function formatCount(value: number) {
  return value.toLocaleString();
}

function PersonRow({
  person,
  showUnfollow,
  onUnfollowed,
}: {
  person: AccountSocialPerson;
  showUnfollow?: boolean;
  onUnfollowed?: (id: string) => void;
}) {
  const [following, setFollowing] = useState(true);

  const avatar = (
    <span
      className="account-profile__person-avatar"
      style={{ "--story-color": person.avatarColor } as CSSProperties}
      aria-hidden="true"
    >
      {person.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.avatarUrl} alt="" width={40} height={40} />
      ) : (
        person.avatarInitials
      )}
    </span>
  );

  const body = (
    <>
      {avatar}
      <span className="account-profile__person-copy">
        <span className="account-profile__person-name">
          {person.name}
          {person.verified ? (
            <svg
              className="account-profile__person-verified"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-label="Verified"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ) : null}
        </span>
        <span className="account-profile__person-handle">{person.handle}</span>
        {person.meta ? <span className="account-profile__person-meta">{person.meta}</span> : null}
      </span>
    </>
  );

  return (
    <div className="account-profile__person account-profile__person--row">
      {person.href ? (
        <Link href={person.href} className="account-profile__person-main">
          {body}
        </Link>
      ) : (
        <div className="account-profile__person-main">{body}</div>
      )}
      {showUnfollow && person.slug ? (
        <FollowButton
          following={following}
          creatorSlug={person.slug}
          name={person.name}
          className="btn btn--sm btn--secondary"
          onFollowingChange={(next) => {
            setFollowing(next);
            if (!next) onUnfollowed?.(person.id);
          }}
        />
      ) : null}
    </div>
  );
}

const TAB_COPY: Record<
  AccountSocialTab,
  { title: string; empty: string }
> = {
  followers: {
    title: "Followers",
    empty: "When people follow you, they’ll show up here.",
  },
  following: {
    title: "Following",
    empty: "Follow creators from the feed or their profile — they’ll show up here.",
  },
  subscriptions: {
    title: "Subscriptions",
    empty: "Subscribe to a creator from their profile to see them here.",
  },
};

export default function AccountProfileView({
  profile,
  initialTab = "subscriptions",
}: {
  profile: AccountProfile;
  initialTab?: AccountSocialTab;
}) {
  const [tab, setTab] = useState<AccountSocialTab>(initialTab);
  const [followingPeople, setFollowingPeople] = useState(profile.social.following);
  const [followingCount, setFollowingCount] = useState(profile.social.followingCount);

  const people = useMemo(() => {
    if (tab === "followers") return profile.social.followers;
    if (tab === "following") return followingPeople;
    return profile.social.subscriptions;
  }, [followingPeople, profile.social.followers, profile.social.subscriptions, tab]);

  const counts = {
    followers: profile.social.followersCount,
    following: followingCount,
    subscriptions: profile.social.subscriptionsCount,
  };

  return (
    <main className="main-content account-profile" id="main">
      <div className="account-profile__card">
        <div className="account-profile__hero">
          <span
            className="account-profile__avatar"
            style={
              profile.avatarColor
                ? ({ "--story-color": profile.avatarColor } as CSSProperties)
                : undefined
            }
            aria-hidden="true"
          >
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="" width={72} height={72} />
            ) : (
              profile.avatarInitial
            )}
          </span>
          <div className="account-profile__hero-copy">
            <h1 className="account-profile__name">{profile.fullName}</h1>
            <p className="account-profile__handle">
              {profile.handle ? `@${profile.handle}` : "No handle set"}
            </p>
            <div className="account-profile__chips">
              <span className="account-profile__chip">{profile.accountTypeLabel}</span>
              <span className="account-profile__chip account-profile__chip--privacy">
                Privacy: {profile.privacyTierLabel}
              </span>
            </div>
          </div>
          <Link href="/feed/me/edit" className="btn btn--secondary btn--sm account-profile__edit">
            Edit Profile
          </Link>
        </div>

        <div className="account-profile__stats" role="tablist" aria-label="Your network">
          {(
            [
              ["followers", "Followers", counts.followers],
              ["following", "Following", counts.following],
              ["subscriptions", "Subscriptions", counts.subscriptions],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`account-profile__stat${tab === id ? " is-active" : ""}`}
              onClick={() => setTab(id)}
            >
              <strong className="account-profile__stat-count">{formatCount(count)}</strong>
              <span className="account-profile__stat-label">{label}</span>
            </button>
          ))}
        </div>

        <section
          className="account-profile__section account-profile__section--social"
          aria-labelledby="account-profile-social"
        >
          <h2 id="account-profile-social" className="account-profile__section-title">
            {TAB_COPY[tab].title}
          </h2>
          {people.length === 0 ? (
            <p className="account-profile__empty">{TAB_COPY[tab].empty}</p>
          ) : (
            <ul className="account-profile__people">
              {people.map((person) => (
                <li key={person.id}>
                  <PersonRow
                    person={person}
                    showUnfollow={tab === "following"}
                    onUnfollowed={(id) => {
                      setFollowingPeople((current) => current.filter((item) => item.id !== id));
                      setFollowingCount((count) => Math.max(0, count - 1));
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="account-profile__actions">
          <Link href="/feed" className="btn btn--secondary">
            Back to feed
          </Link>
        </div>
      </div>
    </main>
  );
}

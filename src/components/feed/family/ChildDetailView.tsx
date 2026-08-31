"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import ProtectionTierIcon from "@/components/guardian/ProtectionTierIcon";
import type { AccountSocialPerson, AccountSocialTab } from "@/lib/feed/account-profile";
import { formatCount } from "@/lib/feed/format";
import type { ChildDetailData } from "@/lib/guardian/child-detail";

function PersonRow({ person }: { person: AccountSocialPerson }) {
  const body = (
    <>
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
    </div>
  );
}

const TAB_COPY: Record<AccountSocialTab, { title: string; empty: string }> = {
  followers: {
    title: "Followers",
    empty: "No followers yet.",
  },
  following: {
    title: "Following",
    empty: "Not following any creators yet.",
  },
  subscriptions: {
    title: "Subscriptions",
    empty: "No active subscriptions yet.",
  },
};

type ActivityTab = AccountSocialTab | "posts";

export default function ChildDetailView({
  child,
  firstName,
}: {
  child: ChildDetailData;
  firstName: string | null;
}) {
  const [tab, setTab] = useState<ActivityTab>("posts");

  const people = useMemo(() => {
    if (tab === "followers") return child.social.followers;
    if (tab === "following") return child.social.following;
    if (tab === "subscriptions") return child.social.subscriptions;
    return [];
  }, [child.social.followers, child.social.following, child.social.subscriptions, tab]);

  const sectionTitle =
    tab === "posts" ? "Posts" : TAB_COPY[tab].title;

  const sectionEmpty =
    tab === "posts"
      ? `${child.firstName} has not posted yet.`
      : TAB_COPY[tab].empty;

  return (
    <div className="app-shell">
      <LeftNav firstName={firstName} />
      <main className="main-content child-detail" id="main">
        <div className="child-detail__card">
          <header className="child-detail__header">
            <Link href="/feed/family-center" className="child-detail__back">
              ← Family Center
            </Link>
            <p className="child-detail__eyebrow">Child account</p>
          </header>

          <div className="child-detail__hero">
            <span
              className="child-detail__avatar"
              style={{ "--story-color": child.avatarColor } as CSSProperties}
              aria-hidden="true"
            >
              {child.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={child.avatarUrl} alt="" width={72} height={72} />
              ) : (
                child.avatarInitials
              )}
            </span>
            <div className="child-detail__hero-copy">
              <h1 className="child-detail__name">{child.fullName}</h1>
              <p className="child-detail__handle">{child.handleLabel}</p>
              <div className="child-detail__chips">
                <span className="child-detail__chip">Minor</span>
                <span className="child-detail__chip child-detail__chip--privacy">
                  <ProtectionTierIcon tier={child.protectionLevel} />
                  Privacy: {child.protectionLevelLabel}
                </span>
                <span className="child-detail__chip child-detail__chip--status">
                  {child.statusLabel}
                </span>
              </div>
            </div>
            <div className="child-detail__hero-actions">
              <Link
                href={child.messagesHref}
                className="child-detail__message"
                aria-label={`Message ${child.fullName}`}
                title={`Message ${child.fullName}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </Link>
            </div>
          </div>

          <section className="child-detail__info" aria-labelledby="child-detail-info">
            <h2 id="child-detail-info" className="child-detail__section-title">
              Account details
            </h2>
            <dl className="child-detail__facts">
              <div className="child-detail__fact">
                <dt>Email</dt>
                <dd>{child.email}</dd>
              </div>
              {child.age != null ? (
                <div className="child-detail__fact">
                  <dt>Age</dt>
                  <dd>{child.age} years old</dd>
                </div>
              ) : null}
              {child.dateOfBirth ? (
                <div className="child-detail__fact">
                  <dt>Date of birth</dt>
                  <dd>{child.dateOfBirth}</dd>
                </div>
              ) : null}
              {child.locationLabel ? (
                <div className="child-detail__fact">
                  <dt>Location</dt>
                  <dd>{child.locationLabel}</dd>
                </div>
              ) : null}
              <div className="child-detail__fact">
                <dt>Member since</dt>
                <dd>{child.memberSince}</dd>
              </div>
              <div className="child-detail__fact">
                <dt>Linked to you</dt>
                <dd>{child.linkedAtDisplay}</dd>
              </div>
              <div className="child-detail__fact child-detail__fact--wide">
                <dt>Protection</dt>
                <dd>{child.protectionLevelDescription}</dd>
              </div>
            </dl>
          </section>

          <section className="child-detail__activity" aria-labelledby="child-detail-activity">
            <h2 id="child-detail-activity" className="child-detail__section-title">
              Platform activity
            </h2>
            <div className="child-detail__stats" role="tablist" aria-label="Platform activity">
              {(
                [
                  ["posts", "Posts", child.activity.postCount],
                  ["followers", "Followers", child.activity.followersCount],
                  ["following", "Following", child.activity.followingCount],
                  ["subscriptions", "Subscriptions", child.activity.subscriptionsCount],
                ] as const
              ).map(([id, label, count]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  className={`child-detail__stat${tab === id ? " is-active" : ""}`}
                  onClick={() => setTab(id)}
                >
                  <strong className="child-detail__stat-count">{formatCount(count)}</strong>
                  <span className="child-detail__stat-label">{label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="child-detail__section" aria-labelledby="child-detail-social">
            <h2 id="child-detail-social" className="child-detail__section-title">
              {sectionTitle}
            </h2>
            {tab === "posts" ? (
              <p className="child-detail__empty">{sectionEmpty}</p>
            ) : people.length === 0 ? (
              <p className="child-detail__empty">{sectionEmpty}</p>
            ) : (
              <ul className="account-profile__people">
                {people.map((person) => (
                  <li key={person.id}>
                    <PersonRow person={person} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="child-detail__actions">
            {child.profileHref ? (
              <Link href={child.profileHref} className="btn btn--secondary">
                View public profile
              </Link>
            ) : null}
            <Link href="/feed/family-center" className="btn btn--secondary">
              Back to Family Center
            </Link>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}

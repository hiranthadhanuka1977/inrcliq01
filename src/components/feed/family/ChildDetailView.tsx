"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import ProtectionTierIcon from "@/components/guardian/ProtectionTierIcon";
import { DmContactStatus, dmContactSafetyStatus } from "@/components/guardian/family-center/DmContactStatus";
import type { AccountSocialPerson, AccountSocialTab } from "@/lib/feed/account-profile";
import { formatCount } from "@/lib/feed/format";
import type { ChildDetailData } from "@/lib/guardian/child-detail";

function DmContactRow({
  childId,
  contact,
}: {
  childId: string;
  contact: ChildDetailData["dmContacts"][number];
}) {
  const status = dmContactSafetyStatus(contact.id);
  const detailHref = `/family-circle/accounts/${childId}/dm/${contact.id}`;

  return (
    <Link
      href={detailHref}
      className="account-profile__person account-profile__person--row child-detail__dm-row child-detail__dm-row--link"
    >
      <span className="account-profile__person-main">
        <span
          className="account-profile__person-avatar"
          style={{ "--story-color": contact.avatarColor } as CSSProperties}
          aria-hidden="true"
        >
          {contact.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={contact.avatarUrl} alt="" width={40} height={40} />
          ) : (
            contact.avatarInitials
          )}
        </span>
        <span className="account-profile__person-copy">
          <span className="account-profile__person-name">{contact.name}</span>
          <span className="account-profile__person-handle">{contact.handle}</span>
          {contact.lastActiveLabel ? (
            <span className="account-profile__person-meta">{contact.lastActiveLabel}</span>
          ) : null}
        </span>
      </span>
      <DmContactStatus status={status} />
    </Link>
  );
}

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
}: {
  child: ChildDetailData;
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
    <section className="family-portal-panel child-detail" aria-labelledby="child-detail-name">
      <div className="child-detail__card">
        <header className="child-detail__header">
          <Link href="/family-circle/accounts" className="child-detail__back">
            ← Linked accounts
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
              <h1 className="child-detail__name" id="child-detail-name">
                {child.fullName}
              </h1>
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
              {child.profileHref ? (
                <Link
                  href={child.profileHref}
                  className="child-detail__hero-action"
                  aria-label="View public profile"
                  title="View public profile"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </Link>
              ) : null}
              <Link
                href={child.messagesHref}
                className="child-detail__hero-action"
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

          <div className="child-detail__activity-block">
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
                    aria-controls="child-detail-activity-panel"
                    id={`child-detail-activity-tab-${id}`}
                    className={`child-detail__stat${tab === id ? " is-active" : ""}`}
                    onClick={() => setTab(id)}
                  >
                    <strong className="child-detail__stat-count">{formatCount(count)}</strong>
                    <span className="child-detail__stat-label">{label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section
              id="child-detail-activity-panel"
              className="child-detail__section child-detail__section--tab-panel"
              role="tabpanel"
              aria-labelledby={`child-detail-activity-tab-${tab}`}
            >
              <h2 className="child-detail__section-title">{sectionTitle}</h2>
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
          </div>

          <section id="child-detail-dm" className="child-detail__dm" aria-labelledby="child-detail-dm-title">
            <h2 id="child-detail-dm-title" className="child-detail__section-title">
              Direct messaging
            </h2>
            <p className="child-detail__dm-policy">{child.dmPolicySummary}</p>
            {child.dmContacts.length === 0 ? (
              <p className="child-detail__empty">
                {child.protectionLevel === "strict"
                  ? `${child.firstName} does not have any direct message conversations.`
                  : `${child.firstName} is not messaging anyone yet.`}
              </p>
            ) : (
              <ul className="account-profile__people child-detail__dm-list">
                {child.dmContacts.map((contact) => (
                  <li key={contact.id}>
                    <DmContactRow childId={child.id} contact={contact} />
                  </li>
                ))}
              </ul>
            )}
            <p className="child-detail__dm-note">
              Shows who {child.firstName} is messaging — not private message content.
            </p>
          </section>

          <section className="child-detail__info child-detail__info--last" aria-labelledby="child-detail-info">
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
        </div>
    </section>
  );
}

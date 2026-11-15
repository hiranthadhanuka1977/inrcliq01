"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import PageBodyClass from "@/components/feed/PageBodyClass";
import type {
  ProfileDirectory,
  ProfileDirectoryKind,
  ProfileDirectoryPerson,
} from "@/lib/feed/profile-directory";

const COPY: Record<ProfileDirectoryKind, { title: string; empty: string; search: string; noun: string }> = {
  followers: {
    title: "Followers",
    empty: "No followers yet.",
    search: "Search by name or handle",
    noun: "people",
  },
  following: {
    title: "Following",
    empty: "Not following anyone yet.",
    search: "Search by name or handle",
    noun: "people",
  },
  subscribers: {
    title: "Subscribers",
    empty: "No subscribers yet.",
    search: "Search by name or handle",
    noun: "people",
  },
};

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/^@/, "");
}

function matchesPerson(person: ProfileDirectoryPerson, query: string) {
  if (!query) return true;
  return normalize(person.name).includes(query) || normalize(person.handle).includes(query);
}

function PersonRow({ person }: { person: ProfileDirectoryPerson }) {
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
      </span>
    </>
  );

  if (!person.href) {
    return <div className="account-profile__person">{body}</div>;
  }

  return (
    <Link href={person.href} className="account-profile__person">
      {body}
    </Link>
  );
}

export default function ProfileDirectoryView({ directory }: { directory: ProfileDirectory }) {
  const [query, setQuery] = useState("");
  const copy = COPY[directory.kind];
  const normalizedQuery = normalize(query);
  const people = useMemo(
    () => directory.people.filter((person) => matchesPerson(person, normalizedQuery)),
    [directory.people, normalizedQuery],
  );
  const total = directory.people.length;
  const visible = people.length;
  const summary = query.trim()
    ? visible === 1
      ? `1 match`
      : `${visible.toLocaleString()} matches`
    : total === 1
      ? `1 person`
      : `${total.toLocaleString()} ${copy.noun}`;

  return (
    <>
      <PageBodyClass pageClass="page-profile" />
      <div className="app-shell page-profile">
        <LeftNav />
        <main className="main-content profile-page" id="main">
          <div className="profile-page__inner">
            <section className="profile-directory" aria-labelledby="profile-directory-title">
              <Link href={`/feed/profile/${directory.slug}`} className="profile-directory__back">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                </svg>
                {directory.name}
              </Link>
              <h1 id="profile-directory-title">{copy.title}</h1>
              <p className="profile-directory__handle">{directory.handle}</p>

              <label className="profile-directory__search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={copy.search}
                  aria-label={copy.search}
                />
              </label>
              <p className="profile-directory__summary" aria-live="polite">
                {summary}
              </p>

              {visible === 0 ? (
                <p className="profile-directory__empty">{query.trim() ? "No matches." : copy.empty}</p>
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
        </main>
        <MobileNav />
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import PageBodyClass from "@/components/feed/PageBodyClass";
import type { ShareRecipient } from "@/lib/feed/share-profile";

type ShareResponse = {
  error?: string;
  sent?: number;
  sentUserIds?: string[];
  confirmation?: string;
  failures?: { userId: string; name: string; error: string }[];
};

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/^@/, "");
}

function matchesPerson(person: ShareRecipient, query: string) {
  if (!query) return true;
  return normalize(person.name).includes(query) || normalize(person.handle).includes(query);
}

function networkLabel(person: Pick<ShareRecipient, "followsYou" | "following">) {
  const parts: string[] = [];
  if (person.followsYou) parts.push("Follows you");
  if (person.following) parts.push("Following");
  return parts.join(" · ");
}

function PersonAvatar({ person }: { person: ShareRecipient }) {
  return (
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
}

function PersonCopy({ person }: { person: ShareRecipient }) {
  const relation = networkLabel(person);
  return (
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
      {relation ? <span className="account-profile__person-meta">{relation}</span> : null}
    </span>
  );
}

export default function ProfileShareView({
  slug,
  name,
  handle,
  people,
  signedIn,
  loadError,
}: {
  slug: string;
  name: string;
  handle: string;
  people: ShareRecipient[];
  signedIn: boolean;
  loadError: string | null;
}) {
  const profileHref = `/feed/profile/${slug}`;
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const normalizedQuery = normalize(query);
  const visiblePeople = useMemo(
    () => people.filter((person) => matchesPerson(person, normalizedQuery)),
    [people, normalizedQuery],
  );
  const selectedPeople = useMemo(
    () =>
      selectedIds
        .map((id) => people.find((person) => person.id === id))
        .filter((person): person is ShareRecipient => Boolean(person)),
    [people, selectedIds],
  );
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const busy = sending || done;
  const total = people.length;
  const visible = visiblePeople.length;
  const summary = query.trim()
    ? visible === 1
      ? "1 match"
      : `${visible.toLocaleString()} matches`
    : total === 1
      ? "1 person"
      : `${total.toLocaleString()} people`;

  function addPerson(id: string) {
    if (busy) return;
    setSelectedIds((current) => (current.includes(id) ? current : [...current, id]));
  }

  function removePerson(id: string) {
    if (busy) return;
    setSelectedIds((current) => current.filter((currentId) => currentId !== id));
  }

  async function send() {
    if (sending || done || selectedIds.length === 0) return;
    setSending(true);
    setSendError(null);
    setConfirmation(null);
    try {
      const response = await fetch(`/api/feed/profile/${encodeURIComponent(slug)}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selectedIds }),
      });
      const data = (await response.json().catch(() => null)) as ShareResponse | null;
      if (!response.ok) {
        setSendError(data?.error || "Could not share this profile.");
        return;
      }

      setConfirmation(data?.confirmation || "Profile sent.");
      const failures = data?.failures ?? [];
      if (failures.length > 0) {
        setSendError(failures.map((failure) => `${failure.name}: ${failure.error}`).join(" "));
        const sentIds = new Set(data?.sentUserIds ?? []);
        setSelectedIds((current) => current.filter((id) => !sentIds.has(id)));
        return;
      }
      setDone(true);
    } catch {
      setSendError("Could not share this profile.");
    } finally {
      setSending(false);
    }
  }

  const showNetwork = signedIn && !loadError;

  return (
    <>
      <PageBodyClass pageClass="page-profile" />
      <div className="app-shell page-profile">
        <LeftNav />
        <main className="main-content profile-page" id="main">
          <div className="profile-page__inner">
            <section className="profile-directory profile-share" aria-labelledby="profile-share-title">
              <Link
                href={profileHref}
                className="profile-directory__back"
                aria-disabled={sending}
                onClick={(event) => {
                  if (sending) event.preventDefault();
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                </svg>
                {name}
              </Link>
              <h1 id="profile-share-title">Share {name}</h1>
              <p className="profile-directory__handle">{handle}</p>
              <p className="profile-share__intro">
                Send this profile as a direct message to people who follow you and people you follow.
              </p>

              {!signedIn ? <p className="profile-directory__empty">Sign in to share this profile.</p> : null}
              {loadError ? (
                <p className="profile-share__status profile-share__status--error" role="alert">
                  {loadError}
                </p>
              ) : null}

              {showNetwork ? (
                <>
                  <label className="profile-directory__search">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.5-3.5" />
                    </svg>
                    <input
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search by name or handle"
                      aria-label="Search by name or handle"
                      disabled={busy}
                    />
                  </label>

                  {total > 0 ? (
                    <p className="profile-directory__summary" aria-live="polite">
                      {summary}
                    </p>
                  ) : null}

                  {selectedPeople.length > 0 ? (
                    <div className="profile-share__selected">
                      <h2 className="profile-share__selected-title">Sending to</h2>
                      <ul className="profile-share__chips">
                        {selectedPeople.map((person) => (
                          <li key={person.id}>
                            <span className="profile-share__chip">
                              <PersonAvatar person={person} />
                              <span className="profile-share__chip-name">{person.name}</span>
                              <button
                                type="button"
                                className="profile-share__chip-remove"
                                aria-label={`Remove ${person.name}`}
                                disabled={busy}
                                onClick={() => removePerson(person.id)}
                              >
                                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                                  <path
                                    d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {visible === 0 ? (
                    <p className="profile-directory__empty">
                      {query.trim() ? "No matches." : "No one in your network to share with yet."}
                    </p>
                  ) : (
                    <ul className="account-profile__people" aria-label="People in your network">
                      {visiblePeople.map((person) => {
                        const added = selectedIdSet.has(person.id);
                        return (
                          <li key={person.id}>
                            <div
                              className={`account-profile__person account-profile__person--row profile-share__person${added ? " is-added" : ""}`}
                            >
                              <span className="account-profile__person-main">
                                <PersonAvatar person={person} />
                                <PersonCopy person={person} />
                              </span>
                              <button
                                type="button"
                                className={`btn btn--sm profile-share__add${added ? " btn--outline-brand is-added" : " btn--secondary"}`}
                                aria-pressed={added}
                                disabled={added || busy}
                                onClick={() => addPerson(person.id)}
                              >
                                {added ? "Added" : "Add"}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              ) : null}

              {confirmation ? (
                <p className="profile-share__status profile-share__status--ok" role="status">
                  {confirmation}
                </p>
              ) : null}
              {sendError ? (
                <p className="profile-share__status profile-share__status--error" role="alert">
                  {sendError}
                </p>
              ) : null}

              <div className="profile-share__actions">
                {done ? (
                  <Link href={profileHref} className="btn btn--primary">
                    Done
                  </Link>
                ) : (
                  <>
                    <Link
                      href={profileHref}
                      className="btn btn--secondary"
                      aria-disabled={sending}
                      onClick={(event) => {
                        if (sending) event.preventDefault();
                      }}
                    >
                      Cancel
                    </Link>
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={sending || selectedIds.length === 0 || !signedIn || Boolean(loadError)}
                      onClick={() => {
                        void send();
                      }}
                    >
                      {sending ? "Sending…" : "Send"}
                    </button>
                  </>
                )}
              </div>
            </section>
          </div>
        </main>
        <MobileNav />
      </div>
    </>
  );
}

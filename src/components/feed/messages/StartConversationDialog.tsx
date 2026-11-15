"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useDialogA11y } from "@/lib/accessibility/useDialogA11y";
import type { Conversation } from "@/lib/feed/messages";

type MessagePerson = {
  id: string;
  name: string;
  handle: string;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl: string | null;
  verified: boolean;
  followsYou: boolean;
  following: boolean;
};

type PeopleResponse = {
  network?: MessagePerson[];
  others?: MessagePerson[];
  error?: string;
};

function relationLabel(person: Pick<MessagePerson, "followsYou" | "following">) {
  const parts: string[] = [];
  if (person.following) parts.push("Following");
  if (person.followsYou) parts.push("Follows you");
  return parts.join(" · ");
}

function PersonRow({
  person,
  busy,
  onPick,
}: {
  person: MessagePerson;
  busy: boolean;
  onPick: (person: MessagePerson) => void;
}) {
  const relation = relationLabel(person);
  return (
    <li>
      <button
        type="button"
        className="messages-compose-person"
        onClick={() => onPick(person)}
        disabled={busy}
      >
        <span
          className="messages-avatar messages-avatar--sm story-avatar"
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
        <span className="messages-compose-person__copy">
          <span className="messages-compose-person__name">
            {person.name}
            {person.verified ? (
              <svg
                className="messages-compose-person__verified"
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
          <span className="messages-compose-person__handle">{person.handle}</span>
          {relation ? <span className="messages-compose-person__meta">{relation}</span> : null}
        </span>
      </button>
    </li>
  );
}

export default function StartConversationDialog({
  onClose,
  onStarted,
}: {
  onClose: () => void;
  onStarted: (conversation: Conversation) => void;
}) {
  const [query, setQuery] = useState("");
  const [network, setNetwork] = useState<MessagePerson[]>([]);
  const [others, setOthers] = useState<MessagePerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  const close = useCallback(() => {
    if (startingId) return;
    onClose();
  }, [onClose, startingId]);
  const { dialogRef } = useDialogA11y(true, close);

  useEffect(() => {
    const controller = new AbortController();
    const delay = query.trim() ? 200 : 0;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setSearchError(null);
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      fetch(`/api/feed/messages/people?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const data = (await response.json().catch(() => null)) as PeopleResponse | null;
          if (!response.ok) {
            throw new Error(data?.error || "Unable to search people.");
          }
          if (controller.signal.aborted) return;
          setNetwork(data?.network ?? []);
          setOthers(data?.others ?? []);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setSearchError(err instanceof Error ? err.message : "Unable to search people.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, delay);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  async function start(person: MessagePerson) {
    if (startingId) return;
    setStartingId(person.id);
    setStartError(null);
    try {
      const response = await fetch("/api/feed/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: person.id }),
      });
      const data = (await response.json().catch(() => null)) as {
        conversation?: Conversation;
        error?: string;
      } | null;
      if (!response.ok || !data?.conversation) {
        throw new Error(data?.error || "Could not start this conversation.");
      }
      onStarted(data.conversation);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Could not start this conversation.");
      setStartingId(null);
    }
  }

  const searching = query.trim().length > 0;
  const empty = !loading && !searchError && network.length === 0 && others.length === 0;

  return (
    <div
      className="modal-backdrop is-open"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        className="modal messages-compose-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-conversation-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        <h2 id="start-conversation-title">New message</h2>
        <p className="messages-compose-modal__intro">
          Search people you follow, people who follow you, or anyone else on INRCLIQ.
        </p>
        <label className="messages-search messages-compose-modal__search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or handle"
            aria-label="Search people"
            autoComplete="off"
          />
        </label>

        {searchError ? (
          <p className="messages-compose-modal__status messages-compose-modal__error" role="alert">
            {searchError}
          </p>
        ) : null}
        {startError ? (
          <p className="messages-compose-modal__status messages-compose-modal__error" role="alert">
            {startError}
          </p>
        ) : null}
        {loading ? <p className="messages-compose-modal__status">Searching…</p> : null}
        {empty ? (
          <p className="messages-compose-modal__status">
            {searching
              ? "No people match that search."
              : "No followers or people you follow yet. Search to message anyone on INRCLIQ."}
          </p>
        ) : null}

        {!loading && (network.length > 0 || others.length > 0) ? (
          <div className="messages-compose-modal__results">
            {network.length > 0 ? (
              <section aria-label="Following and followers">
                <h3 className="messages-compose-modal__section">Following and followers</h3>
                <ul>
                  {network.map((person) => (
                    <PersonRow key={person.id} person={person} busy={Boolean(startingId)} onPick={(picked) => void start(picked)} />
                  ))}
                </ul>
              </section>
            ) : null}
            {others.length > 0 ? (
              <section aria-label="Other people">
                <h3 className="messages-compose-modal__section">Other people</h3>
                <ul>
                  {others.map((person) => (
                    <PersonRow key={person.id} person={person} busy={Boolean(startingId)} onPick={(picked) => void start(picked)} />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}

        <button type="button" className="btn btn--outline-info messages-compose-modal__cancel" onClick={close} disabled={Boolean(startingId)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

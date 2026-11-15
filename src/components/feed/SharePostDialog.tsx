"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useDialogA11y } from "@/lib/accessibility/useDialogA11y";
import type { PostSharePayload } from "@/lib/feed/post-share-message";

type Person = {
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
  network?: Person[];
  others?: Person[];
  error?: string;
};

type ShareResponse = {
  error?: string;
  confirmation?: string;
  sentUserIds?: string[];
  failures?: { userId: string; name: string; error: string }[];
};

function relationLabel(person: Pick<Person, "followsYou" | "following">) {
  const parts: string[] = [];
  if (person.following) parts.push("Following");
  if (person.followsYou) parts.push("Follows you");
  return parts.join(" · ");
}

function PersonAvatar({ person, small = false }: { person: Person; small?: boolean }) {
  return (
    <span
      className={`messages-avatar story-avatar${small ? " share-post-dialog__chip-avatar" : " messages-avatar--sm"}`}
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

export default function SharePostDialog({
  post,
  onClose,
}: {
  post: PostSharePayload;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [network, setNetwork] = useState<Person[]>([]);
  const [others, setOthers] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [knownPeople, setKnownPeople] = useState<Person[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [mounted, setMounted] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const requestClose = useCallback(() => {
    if (sending) return;
    onClose();
  }, [onClose, sending]);

  const { dialogRef } = useDialogA11y(true, requestClose);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!sending) onClose();
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose, sending]);

  useEffect(() => {
    const controller = new AbortController();
    const delay = query.trim() ? 200 : 0;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setLoadError(null);
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      fetch(`/api/feed/messages/people?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const data = (await response.json().catch(() => null)) as PeopleResponse | null;
          if (!response.ok) throw new Error(data?.error || "Could not search people.");
          if (controller.signal.aborted) return;
          const nextNetwork = data?.network ?? [];
          const nextOthers = data?.others ?? [];
          setNetwork(nextNetwork);
          setOthers(nextOthers);
          setKnownPeople((current) => {
            const byId = new Map(current.map((person) => [person.id, person]));
            for (const person of [...nextNetwork, ...nextOthers]) byId.set(person.id, person);
            return [...byId.values()];
          });
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setLoadError(err instanceof Error ? err.message : "Could not search people.");
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

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedPeople = useMemo(
    () =>
      selectedIds
        .map((id) => knownPeople.find((person) => person.id === id))
        .filter((person): person is Person => Boolean(person)),
    [knownPeople, selectedIds],
  );

  function togglePerson(id: string) {
    if (sending || done) return;
    setSelectedIds((current) => (current.includes(id) ? current.filter((currentId) => currentId !== id) : [...current, id]));
  }

  async function send() {
    if (sending || done || selectedIds.length === 0) return;
    setSending(true);
    setSendError(null);
    setConfirmation(null);
    try {
      const response = await fetch(`/api/feed/posts/${encodeURIComponent(post.postId)}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selectedIds }),
      });
      const data = (await response.json().catch(() => null)) as ShareResponse | null;
      if (!response.ok) {
        setSendError(data?.error || "Could not send this post.");
        return;
      }
      setConfirmation(data?.confirmation || "Post sent.");
      const failures = data?.failures ?? [];
      if (failures.length > 0) {
        setSendError(failures.map((failure) => `${failure.name}: ${failure.error}`).join(" "));
        const sentIds = new Set(data?.sentUserIds ?? []);
        setSelectedIds((current) => current.filter((id) => !sentIds.has(id)));
        return;
      }
      setDone(true);
    } catch {
      setSendError("Could not send this post.");
    } finally {
      setSending(false);
    }
  }

  function renderPerson(person: Person) {
    const added = selectedIdSet.has(person.id);
    const relation = relationLabel(person);
    return (
      <li key={person.id}>
        <button
          type="button"
          className={`messages-compose-person share-post-person${added ? " is-selected" : ""}`}
          aria-pressed={added}
          disabled={sending || done}
          onClick={() => togglePerson(person.id)}
        >
          <PersonAvatar person={person} />
          <span className="messages-compose-person__copy">
            <span className="messages-compose-person__name">
              {person.name}
              {person.verified ? (
                <svg className="messages-compose-person__verified" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ) : null}
            </span>
            <span className="messages-compose-person__handle">{person.handle}</span>
            {relation ? <span className="messages-compose-person__meta">{relation}</span> : null}
          </span>
          <span className="share-post-person__mark" aria-hidden="true" />
        </button>
      </li>
    );
  }

  const previewLine = post.membersOnly ? "Members only" : post.text || (post.hasVideo ? "Video" : "Photo");
  const visible = network.length + others.length;
  const sendLabel = selectedIds.length > 1 ? `Send to ${selectedIds.length}` : "Send";

  if (!mounted) return null;

  return createPortal(
    <div
      className="modal-backdrop is-open share-post-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        className="modal share-post-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-post-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        <header className="share-post-dialog__head">
          <h2 id="share-post-title">Send post</h2>
          <button type="button" className="share-post-dialog__close" aria-label="Close" disabled={sending} onClick={requestClose}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="share-post-dialog__preview">
          {post.imageUrl || post.videoUrl || post.hasVideo ? (
            <span className="share-post-dialog__thumb">
              {post.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.imageUrl} alt={post.imageAlt || ""} />
              ) : post.videoUrl ? (
                <video src={`${post.videoUrl}#t=0.1`} muted playsInline preload="metadata" aria-hidden="true" />
              ) : null}
              {post.hasVideo ? <span className="messages-post-share__play" aria-hidden="true" /> : null}
            </span>
          ) : null}
          <span className="share-post-dialog__preview-copy">
            <strong>{post.authorName}</strong>
            {post.authorHandle ? <span>{post.authorHandle}</span> : null}
            <p>{previewLine}</p>
          </span>
        </div>

        {done ? (
          <p className="share-post-dialog__done" role="status">
            {confirmation}
          </p>
        ) : (
          <>
            <label className="messages-search share-post-dialog__search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name or handle"
                aria-label="Search by name or handle"
                autoComplete="off"
                disabled={sending}
              />
            </label>

            {selectedPeople.length > 0 ? (
              <ul className="share-post-dialog__chips" aria-label="Sending to">
                {selectedPeople.map((person) => (
                  <li key={person.id}>
                    <button type="button" className="share-post-dialog__chip" disabled={sending} onClick={() => togglePerson(person.id)}>
                      <PersonAvatar person={person} small />
                      <span>{person.name}</span>
                      <span className="share-post-dialog__chip-x" aria-hidden="true">
                        ×
                      </span>
                      <span className="sr-only">Remove {person.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="share-post-dialog__results">
              {loadError ? (
                <p className="share-post-dialog__status share-post-dialog__status--error" role="alert">
                  {loadError}
                </p>
              ) : null}
              {sendError ? (
                <p className="share-post-dialog__status share-post-dialog__status--error" role="alert">
                  {sendError}
                </p>
              ) : null}
              {confirmation && !done ? (
                <p className="share-post-dialog__status share-post-dialog__status--ok" role="status">
                  {confirmation}
                </p>
              ) : null}
              {loading ? <p className="share-post-dialog__status">Searching…</p> : null}
              {!loading && !loadError && visible === 0 ? (
                <p className="share-post-dialog__status">
                  {query.trim() ? "No matches." : "Search for anyone on INRCLIQ."}
                </p>
              ) : null}
              {!loading && network.length > 0 ? (
                <section aria-label="Following and followers">
                  <h3 className="messages-compose-modal__section">Following and followers</h3>
                  <ul>{network.map(renderPerson)}</ul>
                </section>
              ) : null}
              {!loading && others.length > 0 ? (
                <section aria-label="Other people">
                  <h3 className="messages-compose-modal__section">Other people</h3>
                  <ul>{others.map(renderPerson)}</ul>
                </section>
              ) : null}
            </div>
          </>
        )}

        <footer className="share-post-dialog__foot">
          {done ? (
            <button type="button" className="btn btn--primary" onClick={onClose}>
              Done
            </button>
          ) : (
            <>
              <button type="button" className="btn btn--secondary" disabled={sending} onClick={requestClose}>
                Cancel
              </button>
              <button type="button" className="btn btn--primary" disabled={sending || selectedIds.length === 0} onClick={() => void send()}>
                {sending ? "Sending…" : sendLabel}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}

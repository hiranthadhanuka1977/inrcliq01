"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import PageBodyClass from "@/components/feed/PageBodyClass";
import type { Conversation } from "@/lib/feed/messages";

function ConversationAvatar({
  participant,
  size = "md",
}: {
  participant: Conversation["participant"];
  size?: "sm" | "md";
}) {
  const className = `messages-avatar messages-avatar--${size} story-avatar`;
  const style = { "--story-color": participant.avatarColor } as CSSProperties;

  return (
    <span className={className} style={style} aria-hidden="true">
      {participant.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={participant.avatarUrl} alt="" width={size === "sm" ? 40 : 44} height={size === "sm" ? 40 : 44} />
      ) : (
        participant.initials
      )}
    </span>
  );
}

export default function MessagesView({
  initialConversations = [],
}: {
  initialConversations?: Conversation[];
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState(initialConversations[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [loading, setLoading] = useState(initialConversations.length === 0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (initialConversations.length === 0) setLoading(true);
        setError(null);
        const response = await fetch("/api/feed/messages", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(response.status === 401 ? "Sign in to view messages." : "Failed to load messages.");
        }
        const data = (await response.json()) as { conversations: Conversation[] };
        if (cancelled) return;
        setConversations(data.conversations);
        setActiveId((current) => {
          if (current && data.conversations.some((item) => item.id === current)) return current;
          return data.conversations[0]?.id || "";
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load messages.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [activeId, conversations],
  );

  const filteredConversations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return conversations;
    return conversations.filter((conversation) => {
      const { participant, preview } = conversation;
      return (
        participant.name.toLowerCase().includes(normalized) ||
        participant.handle.toLowerCase().includes(normalized) ||
        preview.toLowerCase().includes(normalized)
      );
    });
  }, [conversations, query]);

  async function openConversation(id: string) {
    setActiveId(id);
    setMobileChatOpen(true);
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === id ? { ...conversation, unread: 0 } : conversation,
      ),
    );

    try {
      const response = await fetch(`/api/feed/messages/${id}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { conversation: Conversation };
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === id ? data.conversation : conversation,
        ),
      );
    } catch {
      // Keep optimistic unread clear.
    }
  }

  function handleBackToList() {
    setMobileChatOpen(false);
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || !activeConversation || sending) return;

    setSending(true);
    setDraft("");
    setError(null);

    try {
      const response = await fetch(`/api/feed/messages/${activeConversation.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      if (!response.ok) {
        throw new Error("Could not send message.");
      }
      const data = (await response.json()) as { conversation: Conversation };
      setConversations((current) => {
        const updated = current.map((conversation) =>
          conversation.id === data.conversation.id ? data.conversation : conversation,
        );
        return [...updated].sort((a, b) => {
          if (a.id === data.conversation.id) return -1;
          if (b.id === data.conversation.id) return 1;
          return 0;
        });
      });
    } catch (err) {
      setDraft(trimmed);
      setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageBodyClass pageClass="page-messages" />
      <div className="app-shell page-messages">
        <LeftNav />
        <main className="main-content messages-page">
          <div
            className={`messages-layout${mobileChatOpen ? " messages-layout--chat-open" : ""}`}
          >
            <aside className="messages-sidebar" aria-label="Conversations">
              <header className="messages-sidebar__head">
                <h1>Messages</h1>
                <button type="button" className="btn btn--sm btn--icon btn--secondary messages-sidebar__compose" aria-label="New message">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </header>

              <label className="messages-search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search messages"
                  aria-label="Search messages"
                />
              </label>

              {error ? <p className="messages-sidebar__error">{error}</p> : null}
              {loading ? <p className="messages-sidebar__status">Loading conversations…</p> : null}

              <ul className="messages-thread-list" role="list">
                {!loading && filteredConversations.length === 0 ? (
                  <li className="messages-sidebar__status">No conversations yet.</li>
                ) : null}
                {filteredConversations.map((conversation) => {
                  const isActive = conversation.id === activeId;
                  return (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        className={`messages-thread${isActive ? " is-active" : ""}${conversation.unread > 0 ? " is-unread" : ""}`}
                        onClick={() => void openConversation(conversation.id)}
                        aria-current={isActive ? "true" : undefined}
                      >
                        <ConversationAvatar participant={conversation.participant} size="sm" />
                        <span className="messages-thread__body">
                          <span className="messages-thread__row">
                            <strong>{conversation.participant.name}</strong>
                            <time>{conversation.previewTime}</time>
                          </span>
                          <span className="messages-thread__row">
                            <span className="messages-thread__preview">{conversation.preview}</span>
                            {conversation.unread > 0 ? (
                              <span className="messages-thread__badge" aria-label={`${conversation.unread} unread`}>
                                {conversation.unread}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <section className="messages-chat" aria-label="Chat">
              {activeConversation ? (
                <>
                  <header className="messages-chat__head">
                    <button
                      type="button"
                      className="btn btn--sm btn--icon btn--secondary messages-chat__back"
                      aria-label="Back to conversations"
                      onClick={handleBackToList}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                      </svg>
                    </button>

                    <div className="messages-chat__identity">
                      <ConversationAvatar participant={activeConversation.participant} />
                      <div>
                        <p className="messages-chat__name">
                          {activeConversation.participant.slug ? (
                            <Link href={`/feed/profile/${activeConversation.participant.slug}`}>
                              {activeConversation.participant.name}
                            </Link>
                          ) : (
                            activeConversation.participant.name
                          )}
                        </p>
                        <p className="messages-chat__meta">
                          {activeConversation.participant.handle}
                          {activeConversation.participant.online ? (
                            <span className="messages-chat__status"> · Online</span>
                          ) : null}
                        </p>
                      </div>
                    </div>

                    <div className="messages-chat__actions">
                      <button type="button" className="btn btn--sm btn--icon btn--secondary" aria-label="More options">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <circle cx="12" cy="5" r="1.75" />
                          <circle cx="12" cy="12" r="1.75" />
                          <circle cx="12" cy="19" r="1.75" />
                        </svg>
                      </button>
                    </div>
                  </header>

                  <div className="messages-chat__stream" role="log" aria-live="polite" aria-relevant="additions">
                    {activeConversation.messages.map((message) => (
                      <article
                        key={message.id}
                        className={`messages-bubble${message.sender === "me" ? " messages-bubble--mine" : " messages-bubble--theirs"}`}
                      >
                        <p>{message.body}</p>
                        <time>{message.time}</time>
                      </article>
                    ))}
                  </div>

                  <form className="messages-composer" onSubmit={(event) => void sendMessage(event)}>
                    <label className="visually-hidden" htmlFor="messages-composer-input">
                      Write a message
                    </label>
                    <input
                      id="messages-composer-input"
                      className="messages-composer__input"
                      type="text"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder={`Message ${activeConversation.participant.name.split(" ")[0]}`}
                      autoComplete="off"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      className="btn btn--primary btn--sm messages-composer__send"
                      disabled={!draft.trim() || sending}
                    >
                      Send
                    </button>
                  </form>
                </>
              ) : (
                <div className="messages-chat__empty">
                  <p>{loading ? "Loading…" : "Select a conversation to start messaging."}</p>
                </div>
              )}
            </section>
          </div>
        </main>
        <MobileNav />
      </div>
    </>
  );
}

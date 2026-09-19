"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import PageBodyClass from "@/components/feed/PageBodyClass";
import BookingConfirmationCard from "@/components/feed/messages/BookingConfirmationCard";
import BookingStatusNote from "@/components/feed/messages/BookingStatusNote";
import type { Conversation } from "@/lib/feed/messages";
import { mergeConversationLists } from "@/lib/feed/messages-merge";
import { useDialogA11y } from "@/lib/accessibility/useDialogA11y";

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

function messageBookingId(message: Conversation["messages"][number]) {
  return (
    message.booking?.specialRequestId?.trim() ||
    message.bookingNote?.specialRequestId?.trim() ||
    message.booking?.reference?.trim() ||
    message.bookingNote?.reference?.trim() ||
    ""
  );
}

function bookingDetailsTab(
  actorName: string | undefined,
  participantName: string,
  fromMe?: boolean,
): "inbound" | "outbound" {
  if (fromMe === true) return "outbound";
  if (fromMe === false) {
    const actor = actorName?.trim().toLowerCase() || "";
    const participant = participantName.trim().toLowerCase();
    // Provider inbox: peer is the fan, so provider name ≠ participant.
    if (actor && participant && actor !== participant) return "inbound";
    // Legacy rows marked fromMe=false on the requester thread still match names.
    if (actor && participant && actor === participant) return "outbound";
    return "inbound";
  }
  const actor = actorName?.trim().toLowerCase() || "";
  const participant = participantName.trim().toLowerCase();
  if (!actor || !participant) return "outbound";
  return actor === participant ? "outbound" : "inbound";
}

export default function MessagesView({
  initialConversations = [],
}: {
  initialConversations?: Conversation[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusSlug = searchParams.get("slug")?.trim().toLowerCase() || "";
  const focusThread = searchParams.get("thread")?.trim() || "";
  const focusBooking = searchParams.get("booking")?.trim() || "";
  const focusLatest = searchParams.get("focus")?.trim().toLowerCase() === "latest";

  const streamRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);
  const chatMenuRef = useRef<HTMLDivElement>(null);
  const refocusComposerRef = useRef(false);
  const lastMessageIdRef = useRef<string>("");
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState(() => {
    if (focusThread && initialConversations.some((item) => item.id === focusThread)) {
      return focusThread;
    }
    if (focusSlug) {
      const match = initialConversations.find(
        (item) => item.participant.slug?.toLowerCase() === focusSlug,
      );
      if (match) return match.id;
    }
    return initialConversations[0]?.id ?? "";
  });
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(
    Boolean(focusSlug || focusThread || focusBooking || focusLatest),
  );
  const [loading, setLoading] = useState(initialConversations.length === 0);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [chatConfirm, setChatConfirm] = useState<"clear" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moderationWarning, setModerationWarning] = useState<{
    title: string;
    message: string;
    category: string;
    confidence: number;
    verificationFailed?: boolean;
    pendingBody: string;
  } | null>(null);
  const deepLinkAppliedRef = useRef(false);
  const [pendingScroll, setPendingScroll] = useState<{
    bookingId: string;
    latest: boolean;
  } | null>(() =>
    focusBooking
      ? { bookingId: focusBooking, latest: true }
      : { bookingId: "", latest: true },
  );

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

        let conversations = data.conversations;
        let slugMatch = focusSlug
          ? conversations.find((item) => item.participant.slug?.toLowerCase() === focusSlug)
          : null;

        // Profile message button: create/open a thread when none exists yet.
        if (focusSlug && !slugMatch && !focusThread) {
          const openResponse = await fetch("/api/feed/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug: focusSlug }),
          });
          if (openResponse.ok) {
            const opened = (await openResponse.json()) as { conversation: Conversation };
            conversations = [
              opened.conversation,
              ...conversations.filter((item) => item.id !== opened.conversation.id),
            ];
            slugMatch = opened.conversation;
          } else if (!cancelled) {
            const openedError = (await openResponse.json().catch(() => null)) as {
              error?: string;
            } | null;
            setError(openedError?.error ?? "Unable to open a conversation with this profile.");
          }
        }

        const threadMatch = focusThread
          ? conversations.find((item) => item.id === focusThread)
          : null;
        const target = threadMatch ?? slugMatch ?? null;

        setActiveId((current) => {
          if (target) return target.id;
          if (current && conversations.some((item) => item.id === current)) return current;
          return conversations[0]?.id || "";
        });

        setConversations((current) => {
          const nextActiveId = target
            ? target.id
            : current.some((item) => item.id === activeId) && conversations.some((item) => item.id === activeId)
              ? activeId
              : conversations[0]?.id ?? "";
          return mergeConversationLists(conversations, current, nextActiveId, null);
        });

        if (target) {
          setMobileChatOpen(true);
          if (!deepLinkAppliedRef.current) {
            deepLinkAppliedRef.current = true;
            if (focusBooking || focusLatest) {
              setPendingScroll({
                bookingId: focusBooking,
                latest: focusLatest || Boolean(focusBooking),
              });
            }
            void fetch(`/api/feed/messages/${target.id}`, { cache: "no-store" })
              .then(async (res) => {
                if (!res.ok || cancelled) return;
                const payload = (await res.json()) as { conversation: Conversation };
                setConversations((current) =>
                  mergeConversationLists(current, current, target.id, payload.conversation),
                );
                setPendingScroll((current) =>
                  current?.bookingId ? current : { bookingId: "", latest: true },
                );
              })
              .catch(() => undefined);
            router.replace("/feed/messages", { scroll: false });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load messages.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setPendingScroll((current) =>
            current?.bookingId ? current : { bookingId: "", latest: true },
          );
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [
    focusBooking,
    focusLatest,
    focusSlug,
    focusThread,
    initialConversations.length,
    router,
  ]);

  useEffect(() => {
    if (!activeId) return;

    let cancelled = false;

    async function loadActiveThread() {
      try {
        const response = await fetch(`/api/feed/messages/${activeId}`, { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as { conversation: Conversation };
        if (cancelled) return;
        setConversations((current) =>
          mergeConversationLists(current, current, activeId, data.conversation),
        );
      } catch {
        // Keep the current thread state on transient errors.
      }
    }

    void loadActiveThread();

    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => {
    let cancelled = false;

    async function refreshInbox() {
      try {
        const listResponse = await fetch("/api/feed/messages", { cache: "no-store" });
        if (!listResponse.ok || cancelled) return;
        const listData = (await listResponse.json()) as { conversations: Conversation[] };

        let activeConversation: Conversation | null = null;
        if (activeId) {
          const threadResponse = await fetch(`/api/feed/messages/${activeId}`, {
            cache: "no-store",
          });
          if (threadResponse.ok && !cancelled) {
            const threadData = (await threadResponse.json()) as { conversation: Conversation };
            activeConversation = threadData.conversation;
          }
        }

        if (cancelled) return;

        setConversations((current) =>
          mergeConversationLists(listData.conversations, current, activeId, activeConversation),
        );
      } catch {
        // Ignore transient poll errors.
      }
    }

    const timer = window.setInterval(() => {
      void refreshInbox();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeId]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [activeId, conversations],
  );
  const isDmRestricted = Boolean(activeConversation?.dmRestricted);
  const activeMessageCount = activeConversation?.messages.length ?? 0;
  const latestMessageId = activeConversation?.messages[activeMessageCount - 1]?.id ?? "";

  function closeChatConfirm() {
    if (clearing) return;
    setChatConfirm(null);
  }

  const { dialogRef: clearDialogRef } = useDialogA11y(Boolean(chatConfirm), closeChatConfirm);

  function scrollStreamToBottom(behavior: ScrollBehavior = "auto") {
    const stream = streamRef.current;
    if (!stream) return;
    stream.scrollTo({ top: stream.scrollHeight, behavior });
  }

  useEffect(() => {
    if (!pendingScroll || !activeConversation || loading) return;
    const stream = streamRef.current;
    if (!stream) return;

    let cancelled = false;
    const scrollToLatest = () => {
      if (cancelled) return;
      const bookingId = pendingScroll.bookingId;
      if (bookingId) {
        const matches = stream.querySelectorAll<HTMLElement>(`[data-booking-id="${bookingId}"]`);
        const target = matches[matches.length - 1];
        if (target) {
          target.scrollIntoView({ block: "end", behavior: "auto" });
          target.classList.add("is-booking-focused");
          window.setTimeout(() => target.classList.remove("is-booking-focused"), 1600);
          setPendingScroll(null);
          return;
        }
        // Keep pending until booking card mounts or fall through to bottom.
        if (activeConversation.messages.length === 0) return;
      }

      scrollStreamToBottom("auto");
      setPendingScroll(null);
    };

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scrollToLatest);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [pendingScroll, activeConversation, activeMessageCount, loading]);

  // Reset tracking when switching conversations.
  useEffect(() => {
    lastMessageIdRef.current = "";
  }, [activeId]);

  // Keep the latest message in view when the thread grows (sent or received).
  useEffect(() => {
    if (!activeId || loading || !latestMessageId) return;

    const previousId = lastMessageIdRef.current;
    if (previousId === latestMessageId) return;
    lastMessageIdRef.current = latestMessageId;

    // First paint for this thread — jump; later messages — ease to the bottom.
    const behavior: ScrollBehavior = previousId ? "smooth" : "auto";
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => scrollStreamToBottom(behavior));
    });
    return () => window.cancelAnimationFrame(frame);
    // latestMessageId alone tracks new messages; do not depend on the messages array.
  }, [activeId, latestMessageId, loading]);

  useEffect(() => {
    if (sending || pendingScroll || !refocusComposerRef.current) return;
    if (isDmRestricted) return;
    refocusComposerRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      composerInputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [sending, pendingScroll, isDmRestricted, activeId]);

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
    setModerationWarning(null);
    setMobileChatOpen(true);
    setPendingScroll({ bookingId: "", latest: true });
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
        mergeConversationLists(current, current, id, data.conversation),
      );
      setPendingScroll({ bookingId: "", latest: true });
    } catch {
      // Keep optimistic unread clear.
    }
  }

  function handleBackToList() {
    setMobileChatOpen(false);
  }

  useEffect(() => {
    setChatMenuOpen(false);
    setChatConfirm(null);
  }, [activeId]);

  useEffect(() => {
    if (!chatMenuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!chatMenuRef.current?.contains(event.target as Node)) {
        setChatMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setChatMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [chatMenuOpen]);

  function requestClearMessages() {
    if (!activeConversation || clearing) return;
    setChatMenuOpen(false);
    setChatConfirm("clear");
  }

  function requestDeleteChat() {
    if (!activeConversation || clearing) return;
    setChatMenuOpen(false);
    setChatConfirm("delete");
  }

  async function confirmChatAction() {
    if (!activeConversation || clearing || !chatConfirm) return;

    setClearing(true);
    setError(null);
    try {
      const scopeQuery = chatConfirm === "delete" ? "?scope=thread" : "";
      const response = await fetch(`/api/feed/messages/${activeConversation.id}${scopeQuery}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        conversation?: Conversation;
        deleted?: boolean;
        threadId?: string;
      } | null;
      if (!response.ok) {
        throw new Error(
          payload?.error?.trim() ||
            (chatConfirm === "delete" ? "Could not delete chat." : "Could not clear messages."),
        );
      }

      if (chatConfirm === "delete") {
        const removedId = activeConversation.id;
        const remaining = conversations.filter((conversation) => conversation.id !== removedId);
        setConversations(remaining);
        setActiveId(remaining[0]?.id ?? "");
        if (remaining.length === 0) setMobileChatOpen(false);
        setModerationWarning(null);
        setDraft("");
        lastMessageIdRef.current = "";
      } else if (payload?.conversation) {
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === payload.conversation!.id ? payload.conversation! : conversation,
          ),
        );
        setModerationWarning(null);
        setDraft("");
        lastMessageIdRef.current = "";
      } else {
        throw new Error("Could not clear messages.");
      }
      setChatConfirm(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : chatConfirm === "delete"
            ? "Could not delete chat."
            : "Could not clear messages.",
      );
      setChatConfirm(null);
    } finally {
      setClearing(false);
    }
  }

  async function sendMessage(event?: FormEvent, opts?: { acceptModeration?: boolean; body?: string }) {
    event?.preventDefault();
    const trimmed = (opts?.body ?? draft).trim();
    if (!trimmed || !activeConversation || sending) return;

    setSending(true);
    setError(null);
    if (!opts?.acceptModeration) {
      setModerationWarning(null);
    }

    try {
      const response = await fetch(`/api/feed/messages/${activeConversation.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: trimmed,
          ...(opts?.acceptModeration ? { acceptModeration: true } : {}),
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        code?: string;
        conversation?: Conversation;
        moderation?: {
          title: string;
          message: string;
          category: string;
          confidence: number;
          verificationFailed?: boolean;
        };
      } | null;

      if (
        response.status === 422 &&
        payload?.moderation &&
        (payload.code === "DM_MODERATION_WARNING" || !payload.conversation)
      ) {
        setDraft(trimmed);
        setModerationWarning({
          title: payload.moderation.title,
          message: payload.moderation.message,
          category: payload.moderation.category,
          confidence: payload.moderation.confidence,
          verificationFailed: payload.moderation.verificationFailed,
          pendingBody: trimmed,
        });
        setError(null);
        return;
      }

      if (!response.ok || !payload?.conversation) {
        throw new Error(
          payload?.error?.trim() ||
            (response.status === 500
              ? "Could not send message. If this keeps happening, restart the app and try again."
              : "Could not send message."),
        );
      }

      setDraft("");
      setModerationWarning(null);
      setConversations((current) => {
        const updated = current.map((conversation) =>
          conversation.id === payload.conversation!.id ? payload.conversation! : conversation,
        );
        return [...updated].sort((a, b) => {
          if (a.id === payload.conversation!.id) return -1;
          if (b.id === payload.conversation!.id) return 1;
          return 0;
        });
      });
      setPendingScroll({ bookingId: "", latest: true });
    } catch (err) {
      setDraft(trimmed);
      setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      refocusComposerRef.current = true;
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

                    <div className="messages-chat__actions" ref={chatMenuRef}>
                      <button
                        type="button"
                        className="btn btn--sm btn--icon btn--secondary"
                        aria-label="More options"
                        aria-haspopup="menu"
                        aria-expanded={chatMenuOpen}
                        disabled={clearing}
                        onClick={() => setChatMenuOpen((open) => !open)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <circle cx="12" cy="5" r="1.75" />
                          <circle cx="12" cy="12" r="1.75" />
                          <circle cx="12" cy="19" r="1.75" />
                        </svg>
                      </button>
                      {chatMenuOpen ? (
                        <div className="messages-chat__menu" role="menu" aria-label="Chat options">
                          <button
                            type="button"
                            className="messages-chat__menu-item"
                            role="menuitem"
                            disabled={clearing}
                            onClick={requestClearMessages}
                          >
                            <svg
                              className="messages-chat__menu-icon"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
                            <span>Clear Messages</span>
                          </button>
                          <button
                            type="button"
                            className="messages-chat__menu-item messages-chat__menu-item--danger"
                            role="menuitem"
                            disabled={clearing}
                            onClick={requestDeleteChat}
                          >
                            <svg
                              className="messages-chat__menu-icon"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                              <path d="M4 6l1-2h14l1 2" />
                            </svg>
                            <span>Delete Chat</span>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </header>

                  <div
                    ref={streamRef}
                    className="messages-chat__stream"
                    role="log"
                    aria-live="polite"
                    aria-relevant="additions"
                  >
                    {activeConversation.messages.map((message) => {
                      const bookingId = messageBookingId(message);
                      const participantName = activeConversation.participant.name;
                      if (message.booking) {
                        return (
                          <BookingConfirmationCard
                            key={message.id}
                            booking={message.booking}
                            time={message.time}
                            creatorName={participantName}
                            fromMe={message.sender === "me"}
                            detailsTab={bookingDetailsTab(
                              message.booking.creatorName,
                              participantName,
                              message.sender === "me",
                            )}
                          />
                        );
                      }
                      if (message.bookingNote) {
                        return (
                          <BookingStatusNote
                            key={message.id}
                            note={message.bookingNote}
                            time={message.time}
                            bookingId={bookingId || undefined}
                            participantName={participantName}
                            detailsTab={bookingDetailsTab(
                              message.bookingNote.creatorName,
                              participantName,
                              message.sender === "me",
                            )}
                          />
                        );
                      }
                      return (
                        <article
                          key={message.id}
                          className={`messages-bubble${message.sender === "me" ? " messages-bubble--mine" : " messages-bubble--theirs"}${message.contentMasked && message.sender === "them" ? " messages-bubble--masked" : ""}${message.contentMasked && message.sender === "me" ? " messages-bubble--masked-sent" : ""}`}
                        >
                          {message.contentMasked && message.sender === "them" ? (
                            <div className="messages-bubble__masked">
                              <span className="messages-bubble__masked-icon" aria-hidden="true">
                                <svg
                                  width="15"
                                  height="15"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.25"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                  <line x1="12" y1="9" x2="12" y2="13" />
                                  <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                              </span>
                              <div className="messages-bubble__masked-copy">
                                <p className="messages-bubble__masked-label">Hidden by safety filter</p>
                                <p className="messages-bubble__masked-body">{message.body}</p>
                              </div>
                            </div>
                          ) : (
                            <p>{message.body}</p>
                          )}
                          {message.contentMasked && message.sender === "me" ? (
                            <span className="messages-bubble__masked-note">Shown masked to recipient</span>
                          ) : null}
                          <time>{message.time}</time>
                        </article>
                      );
                    })}
                  </div>

                  <footer className="messages-chat__footer">
                    {isDmRestricted ? (
                      <div className="messages-chat__restricted" role="status">
                        <svg
                          className="messages-chat__restricted-icon"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <span>
                          {activeConversation.dmRestrictedMessage ??
                            "Direct messaging with this contact is restricted by a guardian."}
                        </span>
                      </div>
                    ) : (
                      <>
                        {moderationWarning ? (
                          <div
                            className="messages-chat__moderation"
                            role="alertdialog"
                            aria-labelledby="dm-moderation-title"
                          >
                            <strong id="dm-moderation-title" className="messages-chat__moderation-title">
                              {moderationWarning.title}
                            </strong>
                            <p className="messages-chat__moderation-body">{moderationWarning.message}</p>
                            {!moderationWarning.verificationFailed ? (
                              <p className="messages-chat__moderation-meta">
                                Flagged as {moderationWarning.category.toLowerCase()} (severity{" "}
                                {Math.round(moderationWarning.confidence * 6)}/6)
                              </p>
                            ) : null}
                            <div className="messages-chat__moderation-actions">
                              <button
                                type="button"
                                className="btn btn--sm btn--secondary"
                                disabled={sending}
                                onClick={() => setModerationWarning(null)}
                              >
                                Edit message
                              </button>
                              <button
                                type="button"
                                className="btn btn--sm btn--primary"
                                disabled={sending}
                                onClick={() =>
                                  void sendMessage(undefined, {
                                    acceptModeration: true,
                                    body: moderationWarning.pendingBody,
                                  })
                                }
                              >
                                {sending ? "Sending…" : "Send anyway"}
                              </button>
                            </div>
                          </div>
                        ) : null}
                        <form className="messages-composer" onSubmit={(event) => void sendMessage(event)}>
                          <label className="sr-only" htmlFor="messages-composer-input">
                            Write a message
                          </label>
                          <input
                            id="messages-composer-input"
                            ref={composerInputRef}
                            className="messages-composer__input"
                            type="text"
                            value={draft}
                            onChange={(event) => {
                              const next = event.target.value;
                              setDraft(next);
                              // Only dismiss the warning once the user actually edits the flagged text.
                              if (
                                moderationWarning &&
                                next.trim() !== moderationWarning.pendingBody.trim()
                              ) {
                                setModerationWarning(null);
                              }
                            }}
                            placeholder={`Message ${activeConversation.participant.name.split(" ")[0]}`}
                            autoComplete="off"
                          />
                          <button
                            type="submit"
                            className="btn btn--primary btn--sm messages-composer__send"
                            disabled={!draft.trim() || sending}
                          >
                            {sending ? "Sending…" : "Send"}
                          </button>
                        </form>
                      </>
                    )}
                  </footer>
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
      {chatConfirm && activeConversation ? (
        <div
          className="modal-backdrop is-open"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-confirm-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeChatConfirm();
          }}
        >
          <div className="modal messages-clear-modal text-center" ref={clearDialogRef} tabIndex={-1}>
            <h2 id="chat-confirm-title">
              {chatConfirm === "delete" ? "Delete chat?" : "Clear messages?"}
            </h2>
            <p className="subtitle mt-4">
              {chatConfirm === "delete" ? (
                <>
                  Delete your chat with <strong>{activeConversation.participant.name}</strong> and remove
                  them from your messages list? This only affects your inbox and can’t be undone.
                </>
              ) : (
                <>
                  Clear all messages in your chat with <strong>{activeConversation.participant.name}</strong>?
                  This only clears the conversation on your side and can’t be undone.
                </>
              )}
            </p>
            <button
              type="button"
              className="btn btn--primary mt-8"
              onClick={() => void confirmChatAction()}
              disabled={clearing}
            >
              {clearing
                ? chatConfirm === "delete"
                  ? "Deleting…"
                  : "Clearing…"
                : chatConfirm === "delete"
                  ? "Yes, delete chat"
                  : "Yes, clear messages"}
            </button>
            <button
              type="button"
              className="btn btn--outline-info mt-3"
              onClick={closeChatConfirm}
              disabled={clearing}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

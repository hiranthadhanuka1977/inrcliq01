"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
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
import MessageBody from "@/components/feed/messages/MessageBody";
import SharedPostCard from "@/components/feed/messages/SharedPostCard";
import StartConversationDialog from "@/components/feed/messages/StartConversationDialog";
import type { Conversation, MessageRequestSummary } from "@/lib/feed/messages";
import type { MessageAttachmentFile } from "@/lib/feed/message-attachment";
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

function requestDeliveryNote(message: Conversation["messages"][number]) {
  if (message.sender !== "me") return null;
  if (message.deliveryStatus === "REQUEST_PENDING") {
    return "Message request — they need to accept before this is delivered";
  }
  if (message.deliveryStatus === "REQUEST_DECLINED") {
    return "Not delivered — they declined this request";
  }
  return null;
}

function enforcementNoticeCopy(notice: {
  level: "warning" | "restricted" | "under_review";
  endsAt?: string;
}) {
  if (notice.level === "restricted") {
    const date = notice.endsAt
      ? new Date(notice.endsAt).toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "later";
    return `You can't message accounts under 18 until ${date} because of repeated safety flags.`;
  }
  if (notice.level === "under_review") {
    return "Your ability to message accounts under 18 is paused while our team reviews your account.";
  }
  return "Messages to accounts under 18 are reviewed for safety. More flagged messages may stop you messaging under-18 accounts.";
}

function MenuIcon({
  kind,
}: {
  kind: "profile" | "search" | "mute" | "unmute" | "block" | "clear" | "delete" | "report";
}) {
  const common = {
    className: "messages-chat__menu-icon",
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  if (kind === "profile") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 19.2c1.3-3 3.5-4.5 6.5-4.5s5.2 1.5 6.5 4.5" />
      </svg>
    );
  }
  if (kind === "search") {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    );
  }
  if (kind === "mute" || kind === "unmute") {
    return (
      <svg {...common}>
        <path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7" />
        <path d="M10 20a2 2 0 0 0 4 0" />
        {kind === "unmute" ? <path d="M4 4l16 16" /> : null}
      </svg>
    );
  }
  if (kind === "block") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="m7.5 7.5 9 9" />
      </svg>
    );
  }
  if (kind === "report") {
    return (
      <svg {...common}>
        <path d="M5 21V4" />
        <path d="M5 4h11l-2.2 4L16 12H5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export default function MessagesView({
  initialConversations = [],
  initialMessageRequests = [],
}: {
  initialConversations?: Conversation[];
  initialMessageRequests?: MessageRequestSummary[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusSlug = searchParams.get("slug")?.trim().toLowerCase() || "";
  const focusThread = searchParams.get("thread")?.trim() || "";
  const focusBooking = searchParams.get("booking")?.trim() || "";
  const focusLatest = searchParams.get("focus")?.trim().toLowerCase() === "latest";

  const streamRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const chatMenuRef = useRef<HTMLDivElement>(null);
  const threadSearchRef = useRef<HTMLInputElement>(null);
  const refocusComposerRef = useRef(false);
  const lastMessageIdRef = useRef<string>("");
  const [conversations, setConversations] = useState(initialConversations);
  const [messageRequests, setMessageRequests] = useState(initialMessageRequests);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const [requestBusy, setRequestBusy] = useState(false);
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
  const [composeOpen, setComposeOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [pendingFiles, setPendingFiles] = useState<
    { id: string; name: string; mime: string; size: number; url?: string; error?: string }[]
  >([]);
  const [mobileChatOpen, setMobileChatOpen] = useState(
    Boolean(focusSlug || focusThread || focusBooking || focusLatest),
  );
  const [loading, setLoading] = useState(
    initialConversations.length === 0 && initialMessageRequests.length === 0,
  );
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [chatConfirm, setChatConfirm] = useState<"clear" | "delete" | "block" | null>(null);
  const [controlsBusy, setControlsBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [threadSearchOpen, setThreadSearchOpen] = useState(false);
  const [threadQuery, setThreadQuery] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moderationWarning, setModerationWarning] = useState<{
    title: string;
    message: string;
    category: string;
    confidence: number;
    verificationFailed?: boolean;
    recipientIsMinor?: boolean;
    canSendAnyway: boolean;
    pendingBody: string;
  } | null>(null);
  const [minorRestriction, setMinorRestriction] = useState<{
    threadId: string;
    message: string;
  } | null>(null);
  const [enforcementNotice, setEnforcementNotice] = useState<{
    threadId: string;
    level: "warning" | "restricted" | "under_review";
    endsAt?: string;
  } | null>(null);
  const deepLinkAppliedRef = useRef(false);
  const activeIdRef = useRef(activeId);
  useEffect(() => {
    activeIdRef.current = activeId;
    activeRequestIdRef.current = activeRequestId;
  }, [activeId, activeRequestId]);
  const [menuThreadId, setMenuThreadId] = useState(activeId);
  if (menuThreadId !== activeId) {
    setMenuThreadId(activeId);
    setChatMenuOpen(false);
    setChatConfirm(null);
    setReportOpen(false);
    setReportReason("");
    setReportError(null);
    setThreadSearchOpen(false);
    setThreadQuery("");
    setActionNotice(null);
  }
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
        const data = (await response.json()) as {
          conversations: Conversation[];
          messageRequests?: MessageRequestSummary[];
        };
        if (cancelled) return;

        setMessageRequests(data.messageRequests ?? []);

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
          const activeId = activeIdRef.current;
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
        const listData = (await listResponse.json()) as {
          conversations: Conversation[];
          messageRequests?: MessageRequestSummary[];
        };

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

        setMessageRequests(listData.messageRequests ?? []);
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
  }, [activeId, activeRequestId]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [activeId, conversations],
  );
  const activeMinorRestriction =
    minorRestriction && minorRestriction.threadId === activeConversation?.id ? minorRestriction : null;
  const isDmRestricted = Boolean(activeConversation?.dmRestricted || activeMinorRestriction);
  const sendLocked = Boolean(activeConversation?.blocked || activeConversation?.blockedByPeer);
  const activeEnforcementNotice =
    enforcementNotice && enforcementNotice.threadId === activeConversation?.id ? enforcementNotice : null;
  const activeMessageCount = activeConversation?.messages.length ?? 0;
  const latestMessageId = activeConversation?.messages[activeMessageCount - 1]?.id ?? "";

  function closeChatConfirm() {
    if (clearing || controlsBusy) return;
    setChatConfirm(null);
  }

  const closeReport = useCallback(() => {
    if (reporting) return;
    setReportOpen(false);
    setReportReason("");
    setReportError(null);
  }, [reporting]);

  const { dialogRef: clearDialogRef } = useDialogA11y(Boolean(chatConfirm), closeChatConfirm);
  const { dialogRef: reportDialogRef } = useDialogA11y(reportOpen, closeReport);

  function scrollStreamToBottom(behavior: ScrollBehavior = "auto") {
    const stream = streamRef.current;
    if (!stream) return;
    stream.scrollTo({ top: stream.scrollHeight, behavior });
  }

  useEffect(() => {
    if (!pendingScroll || !activeConversation || loading || threadQuery.trim()) return;
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
  }, [pendingScroll, activeConversation, activeMessageCount, loading, threadQuery]);

  // Reset tracking when switching conversations.
  useEffect(() => {
    lastMessageIdRef.current = "";
  }, [activeId]);

  // Keep the latest message in view when the thread grows (sent or received).
  useEffect(() => {
    if (!activeId || loading || !latestMessageId || threadQuery.trim()) return;

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
  }, [activeId, latestMessageId, loading, threadQuery]);

  useEffect(() => {
    if (sending || pendingScroll || !refocusComposerRef.current) return;
    if (isDmRestricted || sendLocked) return;
    refocusComposerRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      composerInputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [sending, pendingScroll, isDmRestricted, sendLocked, activeId]);

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

  const filteredMessageRequests = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return messageRequests;
    return messageRequests.filter((request) => {
      const { participant } = request;
      return (
        participant.name.toLowerCase().includes(normalized) ||
        participant.handle.toLowerCase().includes(normalized)
      );
    });
  }, [messageRequests, query]);

  const activeRequest = useMemo(
    () => messageRequests.find((request) => request.id === activeRequestId) ?? null,
    [activeRequestId, messageRequests],
  );

  const threadQueryNormalized = threadQuery.trim().toLowerCase();
  const searchedMessages = useMemo(() => {
    const messages = activeConversation?.messages ?? [];
    if (!threadQueryNormalized) return messages;
    return messages.filter((message) => message.body.toLowerCase().includes(threadQueryNormalized));
  }, [activeConversation, threadQueryNormalized]);

  useEffect(() => {
    if (!threadSearchOpen) return;
    threadSearchRef.current?.focus();
  }, [threadSearchOpen, activeId]);

  useEffect(() => {
    if (!actionNotice) return;
    const timer = window.setTimeout(() => setActionNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  useEffect(() => {
    if (!threadSearchOpen || !threadQueryNormalized) return;
    const match = streamRef.current?.querySelector<HTMLElement>(".is-search-match");
    match?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [threadSearchOpen, threadQueryNormalized, searchedMessages.length, activeId]);

  const closeCompose = useCallback(() => {
    setComposeOpen(false);
  }, []);

  function handleConversationStarted(conversation: Conversation) {
    setComposeOpen(false);
    setError(null);
    setModerationWarning(null);
    setActiveId(conversation.id);
    setMobileChatOpen(true);
    setPendingScroll({ bookingId: "", latest: true });
    setConversations((current) => {
      const rest = current.filter((item) => item.id !== conversation.id);
      return mergeConversationLists([conversation, ...rest], current, conversation.id, conversation);
    });
  }

  async function openConversation(id: string) {
    setActiveRequestId(null);
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

  function openMessageRequest(id: string) {
    setActiveId("");
    setActiveRequestId(id);
    setModerationWarning(null);
    setMobileChatOpen(true);
    setChatMenuOpen(false);
    setChatConfirm(null);
    setReportOpen(false);
    setThreadSearchOpen(false);
    setThreadQuery("");
  }

  async function decideActiveMessageRequest(action: "accept" | "decline") {
    const requestId = activeRequestIdRef.current;
    if (!requestId || requestBusy) return;
    setRequestBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/feed/messages/requests/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        conversation?: Conversation;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error?.trim() || "Could not update this request.");
      }

      const decidedName =
        messageRequests.find((item) => item.id === requestId)?.participant.name ?? "This person";
      setMessageRequests((current) => current.filter((item) => item.id !== requestId));
      setActiveRequestId(null);

      if (action === "accept" && payload?.conversation) {
        const conversation = payload.conversation;
        setActiveId(conversation.id);
        setConversations((current) => {
          const rest = current.filter((item) => item.id !== conversation.id);
          return mergeConversationLists([conversation, ...rest], current, conversation.id, conversation);
        });
        setPendingScroll({ bookingId: "", latest: true });
        setActionNotice(`You accepted a message from ${decidedName}.`);
      } else {
        setActionNotice(`You declined a message from ${decidedName}.`);
        setMobileChatOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this request.");
    } finally {
      setRequestBusy(false);
    }
  }

  function handleBackToList() {
    setMobileChatOpen(false);
  }

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

  function openThreadSearch() {
    setChatMenuOpen(false);
    setThreadSearchOpen(true);
  }

  function closeThreadSearch() {
    setThreadSearchOpen(false);
    setThreadQuery("");
  }

  function requestBlock() {
    if (!activeConversation || controlsBusy || !activeConversation.peerResolvable) return;
    setChatMenuOpen(false);
    if (activeConversation.blocked) {
      void patchThreadControls({ blocked: false });
      return;
    }
    setChatConfirm("block");
  }

  function openReport() {
    if (!activeConversation?.peerResolvable || reporting) return;
    setChatMenuOpen(false);
    setReportError(null);
    setReportReason("");
    setReportOpen(true);
  }

  async function patchThreadControls(body: { muted?: boolean; blocked?: boolean }) {
    if (!activeConversation || controlsBusy) return false;
    setControlsBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/feed/messages/${activeConversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        conversation?: Conversation;
      } | null;
      if (!response.ok || !payload?.conversation) {
        throw new Error(payload?.error?.trim() || "Could not update this chat.");
      }
      const next = payload.conversation;
      setConversations((current) =>
        current.map((conversation) => (conversation.id === next.id ? next : conversation)),
      );
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this chat.");
      return false;
    } finally {
      setControlsBusy(false);
    }
  }

  async function submitReport(event: FormEvent) {
    event.preventDefault();
    if (!activeConversation || reporting) return;
    const reason = reportReason.trim();
    if (!reason) {
      setReportError("A reason is required.");
      return;
    }
    setReporting(true);
    setReportError(null);
    try {
      const response = await fetch(`/api/feed/messages/${activeConversation.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error?.trim() || "Could not submit report.");
      }
      setReportOpen(false);
      setReportReason("");
      setActionNotice("Report submitted. Our team will review it.");
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Could not submit report.");
    } finally {
      setReporting(false);
    }
  }

  async function confirmChatAction() {
    if (!activeConversation || !chatConfirm) return;
    if (chatConfirm === "block") {
      const ok = await patchThreadControls({ blocked: true });
      if (ok) setChatConfirm(null);
      return;
    }
    if (clearing) return;

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

  const readyFiles: MessageAttachmentFile[] = pendingFiles.flatMap((file) =>
    file.url && !file.error ? [{ url: file.url, name: file.name, mime: file.mime, size: file.size }] : [],
  );
  const attachmentUploading = pendingFiles.some((file) => !file.url && !file.error);

  async function addAttachments(list: FileList | null) {
    const selected = Array.from(list ?? []).slice(0, Math.max(0, 4 - pendingFiles.length));
    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    for (const file of selected) {
      const id = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setPendingFiles((current) => [
        ...current,
        { id, name: file.name || "Attachment", mime: file.type, size: file.size },
      ]);
      const form = new FormData();
      form.set("file", file);
      try {
        const response = await fetch("/api/feed/messages/attachments", { method: "POST", body: form });
        const data = (await response.json().catch(() => null)) as {
          error?: string;
          url?: string;
          name?: string;
          mime?: string;
          size?: number;
        } | null;
        if (!response.ok || !data?.url) {
          setPendingFiles((current) =>
            current.map((item) =>
              item.id === id ? { ...item, error: data?.error || "Could not attach that file." } : item,
            ),
          );
          continue;
        }
        setPendingFiles((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  url: data.url,
                  name: data.name || item.name,
                  mime: data.mime || item.mime,
                  size: data.size || item.size,
                }
              : item,
          ),
        );
      } catch {
        setPendingFiles((current) =>
          current.map((item) => (item.id === id ? { ...item, error: "Could not attach that file." } : item)),
        );
      }
    }
  }

  async function sendMessage(event?: FormEvent, opts?: { acceptModeration?: boolean; body?: string }) {
    event?.preventDefault();
    const trimmed = (opts?.body ?? draft).trim();
    const files = readyFiles;
    if ((!trimmed && files.length === 0) || !activeConversation || sending || attachmentUploading) return;
    if (activeConversation.blocked || activeConversation.blockedByPeer) {
      setError(
        activeConversation.blocked
          ? "You blocked this person. Unblock them to send a message."
          : "You can't send messages to this person.",
      );
      return;
    }

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
          ...(files.length ? { attachments: files } : {}),
          ...(opts?.acceptModeration ? { acceptModeration: true } : {}),
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        code?: string;
        conversation?: Conversation;
        enforcement?: {
          level: "warning" | "restricted" | "under_review";
          endsAt?: string;
        };
        moderation?: {
          title: string;
          message: string;
          category: string;
          confidence: number;
          verificationFailed?: boolean;
          recipientIsMinor?: boolean;
          canSendAnyway?: boolean;
          sendAnywayOutcome?: "guardian_review" | "masked" | null;
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
          recipientIsMinor: payload.moderation.recipientIsMinor,
          canSendAnyway: payload.moderation.canSendAnyway !== false,
          pendingBody: trimmed,
        });
        setError(null);
        return;
      }

      if (response.status === 403 && payload?.code === "DM_MINOR_RESTRICTED") {
        setDraft(trimmed);
        setModerationWarning(null);
        setMinorRestriction({
          threadId: activeConversation.id,
          message:
            payload.error?.trim() ||
            "You can't message accounts under 18 right now because of repeated safety flags.",
        });
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
      setPendingFiles([]);
      setModerationWarning(null);
      if (payload.enforcement) {
        setEnforcementNotice({
          threadId: payload.conversation.id,
          level: payload.enforcement.level,
          endsAt: payload.enforcement.endsAt,
        });
      }
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
                <button
                  type="button"
                  className="btn btn--sm btn--icon btn--secondary messages-sidebar__compose"
                  aria-label="New message"
                  aria-haspopup="dialog"
                  aria-expanded={composeOpen}
                  onClick={() => setComposeOpen(true)}
                >
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

              <div className="messages-sidebar__lists">
                {filteredMessageRequests.length > 0 ? (
                  <div className="messages-sidebar__group">
                    <p className="messages-sidebar__section-label" id="messages-requests-label">
                      Requests
                    </p>
                    <ul
                      className="messages-thread-list messages-thread-list--requests"
                      role="list"
                      aria-labelledby="messages-requests-label"
                    >
                      {filteredMessageRequests.map((request) => {
                        const isActive = request.id === activeRequestId;
                        return (
                          <li key={request.id}>
                            <button
                              type="button"
                              className={`messages-thread messages-thread--request${isActive ? " is-active" : ""}`}
                              onClick={() => openMessageRequest(request.id)}
                              aria-current={isActive ? "true" : undefined}
                            >
                              <ConversationAvatar participant={request.participant} size="sm" />
                              <span className="messages-thread__body">
                                <span className="messages-thread__row">
                                  <strong>{request.participant.name}</strong>
                                  <time>{request.previewTime}</time>
                                </span>
                                <span className="messages-thread__row">
                                  <span className="messages-thread__preview messages-thread__preview--request">
                                    Wants to send you a message
                                  </span>
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                <ul className="messages-thread-list" role="list">
                  {!loading &&
                  filteredConversations.length === 0 &&
                  filteredMessageRequests.length === 0 ? (
                    <li className="messages-sidebar__status">No conversations yet.</li>
                  ) : null}
                  {filteredConversations.map((conversation) => {
                    const isActive = conversation.id === activeId && !activeRequestId;
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
              </div>
            </aside>

            <section className="messages-chat" aria-label="Chat">
              {activeRequest ? (
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
                      <ConversationAvatar participant={activeRequest.participant} />
                      <div>
                        <p className="messages-chat__name">
                          {activeRequest.participant.slug ? (
                            <Link href={`/feed/profile/${activeRequest.participant.slug}`}>
                              {activeRequest.participant.name}
                            </Link>
                          ) : (
                            activeRequest.participant.name
                          )}
                        </p>
                        <p className="messages-chat__meta">{activeRequest.participant.handle}</p>
                      </div>
                    </div>
                  </header>
                  <div className="messages-request-panel">
                    <p className="messages-request-panel__lead">
                      <strong>{activeRequest.participant.name}</strong> wants to send you a message.
                    </p>
                    <p className="messages-request-panel__note">
                      You won&apos;t see what they wrote until you accept. Decline and nothing is delivered to your
                      inbox.
                    </p>
                    <div className="messages-request-panel__actions">
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        disabled={requestBusy}
                        onClick={() => void decideActiveMessageRequest("accept")}
                      >
                        {requestBusy ? "Working…" : "Accept"}
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        disabled={requestBusy}
                        onClick={() => void decideActiveMessageRequest("decline")}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </>
              ) : activeConversation ? (
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
                          {activeConversation.muted ? <span> · Muted</span> : null}
                          {activeConversation.blocked ? <span> · Blocked</span> : null}
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
                          {activeConversation.publicSlug &&
                          activeConversation.publicSlug.toLowerCase() !== "me" ? (
                            <Link
                              href={`/feed/profile/${activeConversation.publicSlug}`}
                              className="messages-chat__menu-item"
                              role="menuitem"
                              onClick={() => setChatMenuOpen(false)}
                            >
                              <MenuIcon kind="profile" />
                              <span>View profile</span>
                            </Link>
                          ) : (
                            <button
                              type="button"
                              className="messages-chat__menu-item"
                              role="menuitem"
                              disabled
                              title="This person doesn't have a public profile"
                            >
                              <MenuIcon kind="profile" />
                              <span className="messages-chat__menu-copy">
                                <span>View profile</span>
                                <span className="messages-chat__menu-note">No public profile</span>
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            className="messages-chat__menu-item"
                            role="menuitem"
                            onClick={openThreadSearch}
                          >
                            <MenuIcon kind="search" />
                            <span>Search</span>
                          </button>
                          <button
                            type="button"
                            className="messages-chat__menu-item"
                            role="menuitem"
                            disabled={controlsBusy}
                            onClick={() => {
                              setChatMenuOpen(false);
                              void patchThreadControls({ muted: !activeConversation.muted });
                            }}
                          >
                            <MenuIcon kind={activeConversation.muted ? "unmute" : "mute"} />
                            <span>{activeConversation.muted ? "Unmute" : "Mute"}</span>
                          </button>
                          <button
                            type="button"
                            className="messages-chat__menu-item"
                            role="menuitem"
                            disabled={controlsBusy || !activeConversation.peerResolvable}
                            title={
                              activeConversation.peerResolvable
                                ? undefined
                                : "This person can't be blocked from here yet."
                            }
                            onClick={requestBlock}
                          >
                            <MenuIcon kind="block" />
                            <span className="messages-chat__menu-copy">
                              <span>{activeConversation.blocked ? "Unblock" : "Block"}</span>
                              {!activeConversation.peerResolvable ? (
                                <span className="messages-chat__menu-note">Can't block this account</span>
                              ) : null}
                            </span>
                          </button>
                          <button
                            type="button"
                            className="messages-chat__menu-item"
                            role="menuitem"
                            disabled={clearing}
                            onClick={requestClearMessages}
                          >
                            <MenuIcon kind="clear" />
                            <span>Clear Messages</span>
                          </button>
                          <button
                            type="button"
                            className="messages-chat__menu-item messages-chat__menu-item--danger"
                            role="menuitem"
                            disabled={clearing}
                            onClick={requestDeleteChat}
                          >
                            <MenuIcon kind="delete" />
                            <span>Delete Chat</span>
                          </button>
                          <div className="messages-chat__menu-separator" role="separator" />
                          <button
                            type="button"
                            className="messages-chat__menu-item messages-chat__menu-item--danger"
                            role="menuitem"
                            disabled={reporting || !activeConversation.peerResolvable}
                            title={
                              activeConversation.peerResolvable
                                ? undefined
                                : "This person can't be reported from here yet."
                            }
                            onClick={openReport}
                          >
                            <MenuIcon kind="report" />
                            <span className="messages-chat__menu-copy">
                              <span>Report user</span>
                              {!activeConversation.peerResolvable ? (
                                <span className="messages-chat__menu-note">Can't report this account</span>
                              ) : null}
                            </span>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </header>

                  {actionNotice ? (
                    <p className="messages-chat__notice" role="status">
                      {actionNotice}
                    </p>
                  ) : null}

                  {threadSearchOpen ? (
                    <form
                      className="messages-thread-search"
                      role="search"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const match = streamRef.current?.querySelector<HTMLElement>(".is-search-match");
                        match?.scrollIntoView({ block: "center", behavior: "smooth" });
                      }}
                    >
                      <label className="messages-thread-search__field">
                        <span className="sr-only">Search this conversation</span>
                        <input
                          ref={threadSearchRef}
                          type="search"
                          value={threadQuery}
                          onChange={(event) => setThreadQuery(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              event.preventDefault();
                              closeThreadSearch();
                            }
                          }}
                          placeholder="Search this conversation"
                          aria-label="Search this conversation"
                        />
                      </label>
                      <span className="messages-thread-search__count">
                        {threadQueryNormalized
                          ? `${searchedMessages.length} match${searchedMessages.length === 1 ? "" : "es"}`
                          : "Type to filter"}
                      </span>
                      <button type="button" className="messages-thread-search__close" onClick={closeThreadSearch}>
                        Close
                      </button>
                    </form>
                  ) : null}

                  <div
                    ref={streamRef}
                    className="messages-chat__stream"
                    role="log"
                    aria-live="polite"
                    aria-relevant="additions"
                  >
                    {threadQueryNormalized && searchedMessages.length === 0 ? (
                      <p className="messages-chat__search-empty">
                        No messages match “{threadQuery.trim()}”.
                      </p>
                    ) : null}
                    {searchedMessages.map((message) => {
                      const bookingId = messageBookingId(message);
                      const participantName = activeConversation.participant.name;
                      if (message.postShare && !(message.contentMasked && message.sender === "them")) {
                        return (
                          <SharedPostCard
                            key={message.id}
                            share={message.postShare}
                            time={message.time}
                            fromMe={message.sender === "me"}
                          />
                        );
                      }
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
                      const recipientRemoved =
                        message.contentMasked &&
                        message.sender === "them" &&
                        message.deliveryStatus === "NOT_DELIVERED";
                      const maskedLabel =
                        message.deliveryStatus === "PENDING_REVIEW"
                          ? "Hidden for safety"
                          : recipientRemoved
                            ? "Removed for safety"
                            : "Hidden by safety filter";
                      const requestNote = requestDeliveryNote(message);
                      const senderStatus =
                        message.sender === "me" && message.deliveryStatus === "PENDING_REVIEW"
                          ? "Pending review"
                          : message.sender === "me" && message.deliveryStatus === "NOT_DELIVERED"
                            ? "Not delivered"
                            : requestNote;
                      const senderDeliveryTone =
                        message.deliveryStatus === "NOT_DELIVERED" ||
                        message.deliveryStatus === "REQUEST_DECLINED"
                          ? "not-delivered"
                          : message.deliveryStatus === "REQUEST_PENDING"
                            ? "request-pending"
                            : "pending";
                      return (
                        <article
                          key={message.id}
                          className={`messages-bubble${message.sender === "me" ? " messages-bubble--mine" : " messages-bubble--theirs"}${message.contentMasked && message.sender === "them" ? " messages-bubble--masked" : ""}${recipientRemoved ? " messages-bubble--removed" : ""}${message.contentMasked && message.sender === "me" ? " messages-bubble--masked-sent" : ""}${senderStatus ? ` messages-bubble--${message.deliveryStatus === "NOT_DELIVERED" || message.deliveryStatus === "REQUEST_DECLINED" ? "not-delivered" : message.deliveryStatus === "REQUEST_PENDING" ? "request-pending" : "pending-review"}` : ""}${threadQueryNormalized ? " is-search-match" : ""}`}
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
                                <p className="messages-bubble__masked-label">{maskedLabel}</p>
                                <p className="messages-bubble__masked-body">
                                  <MessageBody text={message.body} />
                                </p>
                              </div>
                            </div>
                          ) : (
                            <>
                              {message.attachment ? (
                                <div className="messages-bubble__files">
                                  {message.attachment.files.map((file) =>
                                    file.mime.startsWith("image/") ? (
                                      <a
                                        key={file.url}
                                        className="messages-bubble__image"
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={file.url} alt={file.name} />
                                      </a>
                                    ) : (
                                      <a
                                        key={file.url}
                                        className="messages-bubble__file"
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        {file.name}
                                      </a>
                                    ),
                                  )}
                                </div>
                              ) : null}
                              {message.body ? (
                                <p>
                                  <MessageBody text={message.body} />
                                </p>
                              ) : null}
                            </>
                          )}
                          {message.contentMasked && message.sender === "me" ? (
                            <span className="messages-bubble__masked-note">Shown masked to recipient</span>
                          ) : null}
                          {senderStatus ? (
                            <span className={`messages-bubble__delivery messages-bubble__delivery--${senderDeliveryTone}`}>
                              {senderStatus}
                            </span>
                          ) : null}
                          <time>{message.time}</time>
                        </article>
                      );
                    })}
                  </div>

                  <footer className="messages-chat__footer">
                    {sendLocked ? (
                      <div className="messages-chat__restricted" role="status">
                        <span>
                          {activeConversation.blocked
                            ? `You blocked ${activeConversation.participant.name}. Unblock them to send messages.`
                            : "You can't send messages in this chat."}
                        </span>
                      </div>
                    ) : isDmRestricted ? (
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
                          {activeMinorRestriction?.message ??
                            activeConversation.dmRestrictedMessage ??
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
                            {moderationWarning.recipientIsMinor &&
                            !moderationWarning.verificationFailed &&
                            !moderationWarning.canSendAnyway ? (
                              <p className="messages-chat__moderation-meta">
                                This message can&apos;t be sent to this account.
                              </p>
                            ) : null}
                            {!moderationWarning.recipientIsMinor && !moderationWarning.verificationFailed ? (
                              <p className="messages-chat__moderation-meta">
                                Flagged as {moderationWarning.category.toLowerCase()} (severity{" "}
                                {Math.round(moderationWarning.confidence * 6)}/6)
                              </p>
                            ) : null}
                            <div className="messages-chat__moderation-actions">
                              {moderationWarning.recipientIsMinor && moderationWarning.verificationFailed ? (
                                <button
                                  type="button"
                                  className="btn btn--sm btn--primary"
                                  disabled={sending}
                                  onClick={() =>
                                    void sendMessage(undefined, { body: moderationWarning.pendingBody })
                                  }
                                >
                                  {sending ? "Checking…" : "Try again"}
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn--sm btn--secondary"
                                    disabled={sending}
                                    onClick={() => setModerationWarning(null)}
                                  >
                                    Edit message
                                  </button>
                                  {moderationWarning.canSendAnyway ? (
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
                                  ) : null}
                                </>
                              )}
                            </div>
                          </div>
                        ) : null}
                        <form className="messages-composer" onSubmit={(event) => void sendMessage(event)}>
                          {pendingFiles.length > 0 ? (
                            <ul className="messages-composer__files">
                              {pendingFiles.map((file) => (
                                <li key={file.id} className="messages-composer__file">
                                  <span>
                                    {file.error ? file.error : file.url ? file.name : `Attaching ${file.name}…`}
                                  </span>
                                  <button
                                    type="button"
                                    aria-label={`Remove ${file.name}`}
                                    onClick={() =>
                                      setPendingFiles((current) => current.filter((item) => item.id !== file.id))
                                    }
                                  >
                                    ×
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          <div className="messages-composer__row">
                            <label className="sr-only" htmlFor="messages-composer-input">
                              Write a message
                            </label>
                            <button
                              type="button"
                              className="messages-composer__attach"
                              aria-label="Attach a file"
                              disabled={sending || pendingFiles.length >= 4}
                              onClick={() => attachmentInputRef.current?.click()}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.82-2.83l8.48-8.48"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                            <input
                              ref={attachmentInputRef}
                              className="sr-only"
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                              onChange={(event) => void addAttachments(event.target.files)}
                            />
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
                              disabled={
                                sending ||
                                attachmentUploading ||
                                (!draft.trim() && readyFiles.length === 0)
                              }
                            >
                              {sending ? "Sending…" : "Send"}
                            </button>
                          </div>
                        </form>
                        {activeEnforcementNotice ? (
                          <div
                            className={`messages-chat__enforcement messages-chat__enforcement--${activeEnforcementNotice.level}`}
                            role="status"
                          >
                            <p>{enforcementNoticeCopy(activeEnforcementNotice)}</p>
                            <button
                              type="button"
                              className="messages-chat__enforcement-dismiss"
                              aria-label="Dismiss notice"
                              onClick={() => setEnforcementNotice(null)}
                            >
                              ×
                            </button>
                          </div>
                        ) : null}
                      </>
                    )}
                  </footer>
                </>
              ) : (
                <div className="messages-chat__empty">
                  <p>
                    {loading
                      ? "Loading…"
                      : filteredMessageRequests.length > 0
                        ? "Select a request or conversation."
                        : "Select a conversation to start messaging."}
                  </p>
                </div>
              )}
            </section>
          </div>
        </main>
        <MobileNav />
      </div>
      {composeOpen ? (
        <StartConversationDialog onClose={closeCompose} onStarted={handleConversationStarted} />
      ) : null}
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
              {chatConfirm === "delete"
                ? "Delete chat?"
                : chatConfirm === "block"
                  ? `Block ${activeConversation.participant.name}?`
                  : "Clear messages?"}
            </h2>
            <p className="subtitle mt-4">
              {chatConfirm === "delete" ? (
                <>
                  Delete your chat with <strong>{activeConversation.participant.name}</strong> and remove
                  them from your messages list? This only affects your inbox and can’t be undone.
                </>
              ) : chatConfirm === "block" ? (
                <>
                  You won’t be able to message each other until you unblock{" "}
                  <strong>{activeConversation.participant.name}</strong>.
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
              disabled={clearing || controlsBusy}
            >
              {chatConfirm === "block"
                ? controlsBusy
                  ? "Blocking…"
                  : "Block"
                : clearing
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
              disabled={clearing || controlsBusy}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {reportOpen && activeConversation ? (
        <div
          className="modal-backdrop is-open"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-report-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeReport();
          }}
        >
          <div className="modal messages-clear-modal messages-report-modal" ref={reportDialogRef} tabIndex={-1}>
            <h2 id="chat-report-title">Report {activeConversation.participant.name}</h2>
            <p className="subtitle mt-4">
              Tell us what happened. This report goes to the platform for review.
            </p>
            <form onSubmit={(event) => void submitReport(event)}>
              <label className="messages-report-modal__label" htmlFor="chat-report-reason">
                Reason
              </label>
              <textarea
                id="chat-report-reason"
                className="messages-report-modal__reason"
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                maxLength={1000}
                rows={4}
                required
                placeholder="What should we review?"
              />
              {reportError ? <p className="messages-report-modal__error">{reportError}</p> : null}
              <button
                type="submit"
                className="btn btn--primary mt-6"
                disabled={reporting || !reportReason.trim()}
              >
                {reporting ? "Submitting…" : "Submit report"}
              </button>
              <button
                type="button"
                className="btn btn--outline-info mt-3"
                onClick={closeReport}
                disabled={reporting}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

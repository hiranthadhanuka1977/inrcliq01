"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { COMPOSER_ACTIVITIES, COMPOSER_FEELINGS } from "@/data/feed/composer-feelings";
import ComposerImageEditor from "@/components/feed/account/ComposerImageEditor";
import ComposerVideoEditor, {
  type VideoEditResult,
  type VideoEditState,
} from "@/components/feed/account/ComposerVideoEditor";
import ShareOnSocialPrompt from "@/components/feed/account/ShareOnSocialPrompt";
import MediaPlayOverlay from "@/components/feed/MediaPlayOverlay";
import { MAX_MEDIA_CAPTION_LENGTH, MAX_POST_MEDIA_ITEMS } from "@/lib/feed/media-limits";
import { mosaicLayout } from "@/lib/feed/media-mosaic";
import { formatClock } from "@/lib/feed/media-trim";
import {
  formatImageModerationError,
  moderateImageFile,
  preloadImageModerationModel,
  shouldModerateUploadFile,
  type ImageModerationBlock,
} from "@/lib/moderation/nsfw-image-moderation";
import { formatByteLimit, looksLikeVideoFile, VIDEO_MAX_BYTES } from "@/lib/uploads/video-limits";
import {
  inspectVideo,
  uploadVideoFile,
  validateVideoDuration,
  validateVideoFile,
  type VideoValidationError,
} from "@/lib/uploads/video-upload-client";

type UploadModerationPayload = {
  title: string;
  message: string;
  category: ImageModerationBlock["category"];
  confidence: number;
  verificationFailed?: boolean;
};

function uploadModerationToBlock(payload: UploadModerationPayload): ImageModerationBlock {
  return {
    allowed: false,
    title: payload.title,
    message: payload.message,
    category: payload.category,
    confidence: payload.confidence,
    predictions: [],
    verificationFailed: payload.verificationFailed,
  };
}

const STORAGE_KEY = "inrcliq:first-post-prompt-dismissed";

const CROSS_POST_PLATFORMS = [
  {
    id: "facebook",
    label: "Facebook",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M13.5 20v-6.5H16l.4-3h-2.9V8.6c0-.9.2-1.5 1.5-1.5H16.5V4.3C16.1 4.2 14.9 4 13.6 4 10.9 4 9 5.7 9 8.9V10.5H6.5v3H9V20h4.5z" />
      </svg>
    ),
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
        <circle cx="12" cy="12" r="4.1" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "x",
    label: "X",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.6 4H20l-6.2 7.1L21 20h-4.7l-4.4-5.8L7 20H4.5l6.7-7.6L3.5 4H8.3l4 5.3L17.6 4zm-.8 14.5h1.4L7.3 5.4H5.8l11 13.1z" />
      </svg>
    ),
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M6.4 9.2H3.6V20h2.8V9.2zM5 4.2a1.7 1.7 0 1 0 .1 3.4A1.7 1.7 0 0 0 5 4.2zM20.4 13.1c0-3.1-1.7-4.5-3.9-4.5-1.8 0-2.6 1-3.1 1.7V9.2h-2.8c.1.8.1 10.8.1 10.8h2.8v-6c0-.3 0-.7.1-1 .3-.7.9-1.5 2-1.5 1.4 0 2 1.1 2 2.6V20h2.8v-6.9z" />
      </svg>
    ),
  },
] as const;

type CrossPostPlatformId = (typeof CROSS_POST_PLATFORMS)[number]["id"];

type ComposerPanel = "photo" | "tag" | "feeling" | "location" | "gif" | "more" | null;

type TaggedPerson = {
  id: string;
  name: string;
  handle: string;
  slug: string | null;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl: string | null;
};

type Checkin = {
  id: string;
  label: string;
  lat?: number;
  lng?: number;
};

type FeelingPick = {
  kind: "feeling" | "activity";
  emoji: string;
  label: string;
};

type ComposerItemStatus = "checking" | "uploading" | "preparing" | "retrying" | "processing" | "ready";

/** A photo, video, or GIF in the post, kept in the order it will appear in the feed. */
type ComposerItem = {
  id: string;
  kind: "image" | "video" | "gif";
  name: string;
  caption: string;
  /** Stored upload URL once the upload finishes. */
  url: string | null;
  /** What the composer shows: a local blob URL until the upload finishes. */
  previewUrl: string;
  /** Only a video's poster frame goes through image moderation; the video itself is not checked. */
  posterUrl: string | null;
  status: ComposerItemStatus;
  progress: number;
  /** Last video edit (trim and thumbnail), so reopening the editor starts where the user left off. */
  videoEdit: VideoEditState | null;
  /** Local preview of a thumbnail picked in the video editor. */
  posterPreviewUrl: string | null;
  posterUploading: boolean;
};

const LEAVE_DURING_UPLOAD_MESSAGE = "Upload in progress. Are you sure you want to leave?";

function itemStatusLabel(item: ComposerItem) {
  switch (item.status) {
    case "checking":
      return "Checking photo…";
    case "preparing":
      return "Preparing video…";
    case "retrying":
      return "Paused — Retrying…";
    case "processing":
      return "Processing video…";
    default:
      return item.kind === "video" ? `Uploading ${item.progress}%…` : "Uploading photo…";
  }
}

function itemLabel(item: ComposerItem, index: number) {
  const noun = item.kind === "video" ? "video" : item.kind === "gif" ? "GIF" : "photo";
  return `${noun} ${index + 1}`;
}

function ComposerItemProgress({ item }: { item: ComposerItem }) {
  if (item.status === "ready" && !item.posterUploading) return null;
  const savingThumbnail = item.status === "ready";
  const indeterminate =
    savingThumbnail || item.kind !== "video" || item.status === "preparing" || item.status === "processing";
  return (
    <div
      className={`composer-video__status${item.status === "retrying" ? " is-paused" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="composer-video__label">{savingThumbnail ? "Saving thumbnail…" : itemStatusLabel(item)}</span>
      <span className="composer-video__track" aria-hidden="true">
        <span
          className={`composer-video__fill${indeterminate ? " is-indeterminate" : ""}`}
          style={{ width: `${item.progress}%` }}
        />
      </span>
    </div>
  );
}

function ScissorsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" />
    </svg>
  );
}

function ComposerItemThumb({ item }: { item: ComposerItem }) {
  if (item.kind === "video") {
    const trim = item.videoEdit?.trim;
    return (
      <>
        {item.posterPreviewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.posterPreviewUrl} alt={item.name} />
        ) : (
          <video
            src={`${item.previewUrl}#t=${trim ? trim.start : 0.1}`}
            muted
            playsInline
            preload="metadata"
            aria-label={item.name}
          />
        )}
        <MediaPlayOverlay className="composer-media-play" />
        {trim && item.status === "ready" && !item.posterUploading ? (
          <span className="composer-trim-badge">
            <ScissorsIcon />
            <span className="sr-only">Trimmed to </span>
            {formatClock(trim.end - trim.start)}
          </span>
        ) : null}
      </>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={item.previewUrl} alt={item.name} />;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

type GifItem = {
  id: string;
  url: string;
  alt: string;
};

type ComposerImageStatusKind = "checking" | "uploading";

function ComposerImageStatus({ kind }: { kind: ComposerImageStatusKind }) {
  const copy =
    kind === "checking"
      ? { title: "Checking photo", detail: "Running our safety check on your image" }
      : { title: "Uploading file", detail: "Adding your photo to the post" };

  return (
    <div
      className={`composer-image-status composer-image-status--${kind}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="composer-image-status__main">
        <span className="composer-image-status__spinner" aria-hidden="true" />
        <div className="composer-image-status__copy">
          <strong className="composer-image-status__title">{copy.title}</strong>
          <p className="composer-image-status__detail">{copy.detail}</p>
        </div>
      </div>
      <div className="composer-image-status__track" aria-hidden="true">
        <span className="composer-image-status__track-fill" />
      </div>
    </div>
  );
}

function PhotoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="6" width="14" height="12" rx="2" fill="currentColor" opacity="0.35" />
      <rect x="7" y="4" width="14" height="12" rx="2" fill="currentColor" />
      <path d="M9.2 13.2 11 11.1l2.2 2.6 1.4-1.7 2.6 3.2H9.2z" fill="var(--color-on-brand)" />
      <circle cx="17.2" cy="7.6" r="1.15" fill="var(--color-on-brand)" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10" cy="8" r="3.1" fill="currentColor" />
      <path d="M4.8 18.5c.4-3.1 2.9-5 5.2-5s4.8 1.9 5.2 5" fill="currentColor" />
      <path
        d="M15.2 11.2h5.1c.5 0 .9.4.9.9v1.7l-2.1 2.1-2.1-2.1v-.9c0-.5.4-.9.9-.9h-2.7v-1.8z"
        fill="currentColor"
      />
    </svg>
  );
}

function FeelingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="9.1" cy="10.2" r="1.05" fill="currentColor" />
      <circle cx="14.9" cy="10.2" r="1.05" fill="currentColor" />
      <path
        d="M8.4 14.2c1.1 1.5 2.3 2.2 3.6 2.2s2.5-.7 3.6-2.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.5c-3.4 0-6.2 2.6-6.2 6.1 0 4.4 6.2 10.9 6.2 10.9s6.2-6.5 6.2-10.9c0-3.5-2.8-6.1-6.2-6.1z"
        fill="currentColor"
      />
      <circle cx="12" cy="9.5" r="2.15" fill="var(--color-on-brand)" />
    </svg>
  );
}

function GifIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.2" y="6.2" width="17.6" height="11.6" rx="3" fill="currentColor" />
      <text x="12" y="14.4" textAnchor="middle" fill="var(--color-on-brand)" fontSize="6.4" fontWeight="800">
        GIF
      </text>
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="6" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="18" cy="12" r="1.7" />
    </svg>
  );
}

export default function FirstPostPrompt({
  firstName,
  profileHref = null,
  variant = "prompt",
  dismissKey = null,
  verified = false,
  onClose,
}: {
  firstName: string | null;
  profileHref?: string | null;
  variant?: "prompt" | "modal";
  /** Scopes dismiss storage to this account so a prior user cannot hide the prompt. */
  dismissKey?: string | null;
  /** Monetized / verified creators can mark posts as subscriber-only. */
  verified?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const fileInputId = useId();
  const titleId = useId();
  const textId = useId();
  const isModal = variant === "modal";
  const rootRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageWarningRef = useRef<HTMLDivElement>(null);
  const textWarningRef = useRef<HTMLDivElement>(null);

  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [imageWarning, setImageWarning] = useState<ImageModerationBlock | null>(null);
  const [textWarning, setTextWarning] = useState<ImageModerationBlock | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [publishedHref, setPublishedHref] = useState<string | null>(null);
  const [panel, setPanel] = useState<ComposerPanel>(null);

  const [items, setItems] = useState<ComposerItem[]>([]);
  const [videoWarning, setVideoWarning] = useState<VideoValidationError | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [mediaEditorOpen, setMediaEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [videoEditingId, setVideoEditingId] = useState<string | null>(null);
  const itemControllersRef = useRef(new Map<string, AbortController>());
  const itemBlobUrlsRef = useRef(new Map<string, string>());
  const posterControllersRef = useRef(new Map<string, AbortController>());
  const posterBlobUrlsRef = useRef(new Map<string, string>());
  /** Poster made automatically during upload, kept as the fallback if a picked thumbnail fails to save. */
  const autoPosterUrlsRef = useRef(new Map<string, string | null>());
  /** Videos whose thumbnail was picked in the editor; the automatic poster must not replace it. */
  const customPosterIdsRef = useRef(new Set<string>());
  const videoEditorOpenerRef = useRef<HTMLElement | null>(null);
  const nextItemIdRef = useRef(0);
  const mediaEditorTitleId = useId();
  const mediaEditorBackRef = useRef<HTMLButtonElement>(null);
  const collageEditRef = useRef<HTMLButtonElement>(null);
  const mediaEditorWasOpenRef = useRef(false);
  const [tagged, setTagged] = useState<TaggedPerson[]>([]);
  const [feeling, setFeeling] = useState<FeelingPick | null>(null);
  const [location, setLocation] = useState<Checkin | null>(null);

  const [peopleQuery, setPeopleQuery] = useState("");
  const [people, setPeople] = useState<TaggedPerson[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);

  const [placeQuery, setPlaceQuery] = useState("");
  const [places, setPlaces] = useState<Checkin[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);

  const [gifQuery, setGifQuery] = useState("");
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [gifsLoading, setGifsLoading] = useState(false);
  const [exclusiveContent, setExclusiveContent] = useState(false);
  const [crossPostPlatforms, setCrossPostPlatforms] = useState<Record<CrossPostPlatformId, boolean>>({
    facebook: false,
    instagram: false,
    x: false,
    linkedin: false,
  });

  const hasAttachment = Boolean(feeling) || Boolean(location) || tagged.length > 0;
  const mediaBusy = items.some((item) => item.status !== "ready" || item.posterUploading);
  const canPost = Boolean(text.trim() || items.length);
  const gifItem = items.find((item) => item.kind === "gif") ?? null;
  const editingItem = editingId ? (items.find((item) => item.id === editingId) ?? null) : null;
  const videoEditingItem = videoEditingId
    ? (items.find((item) => item.id === videoEditingId && item.kind === "video") ?? null)
    : null;

  const storageKey = dismissKey
    ? `${STORAGE_KEY}:${dismissKey}`
    : STORAGE_KEY;

  useEffect(() => {
    if (isModal) {
      setVisible(true);
      return;
    }
    try {
      if (window.localStorage.getItem(storageKey) === "1") return;
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, [isModal, storageKey]);

  useEffect(() => {
    void preloadImageModerationModel();
  }, []);

  useEffect(() => {
    if (!imageWarning) return;
    imageWarningRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [imageWarning]);

  useEffect(() => {
    if (!textWarning) return;
    textWarningRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [textWarning]);

  useEffect(() => {
    if (!videoWarning) return;
    imageWarningRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [videoWarning]);

  useEffect(() => {
    const controllers = itemControllersRef.current;
    const blobUrls = itemBlobUrlsRef.current;
    const posterControllers = posterControllersRef.current;
    const posterBlobUrls = posterBlobUrlsRef.current;
    return () => {
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
      blobUrls.forEach((url) => URL.revokeObjectURL(url));
      blobUrls.clear();
      posterControllers.forEach((controller) => controller.abort());
      posterControllers.clear();
      posterBlobUrls.forEach((url) => URL.revokeObjectURL(url));
      posterBlobUrls.clear();
    };
  }, []);

  useEffect(() => {
    if (videoEditingId) return;
    const opener = videoEditorOpenerRef.current;
    videoEditorOpenerRef.current = null;
    if (opener?.isConnected) opener.focus();
  }, [videoEditingId]);

  useEffect(() => {
    if (!mediaBusy) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = LEAVE_DURING_UPLOAD_MESSAGE;
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [mediaBusy]);

  useEffect(() => {
    if (!mediaEditorOpen) return;
    mediaEditorBackRef.current?.focus();
    // Capture phase on window runs before the dialog's document-level Escape handler.
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || document.querySelector(".image-editor")) return;
      event.preventDefault();
      event.stopPropagation();
      setMediaEditorOpen(false);
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [mediaEditorOpen]);

  useEffect(() => {
    if (mediaEditorOpen) {
      mediaEditorWasOpenRef.current = true;
      return;
    }
    if (!mediaEditorWasOpenRef.current) return;
    mediaEditorWasOpenRef.current = false;
    collageEditRef.current?.focus();
  }, [mediaEditorOpen]);

  useEffect(() => {
    if (!panel) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setPanel(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [panel]);

  useEffect(() => {
    if (panel !== "tag") return;
    const q = peopleQuery.trim();
    if (q.length < 1) {
      setPeople([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPeopleLoading(true);
      try {
        const res = await fetch(`/api/feed/people?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { results?: TaggedPerson[] };
        setPeople(data.results ?? []);
      } catch {
        if (!controller.signal.aborted) setPeople([]);
      } finally {
        setPeopleLoading(false);
      }
    }, 220);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [panel, peopleQuery]);

  useEffect(() => {
    if (panel !== "location") return;
    const q = placeQuery.trim();
    if (q.length < 2) {
      setPlaces([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPlacesLoading(true);
      try {
        const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { results?: Checkin[] };
        setPlaces(data.results ?? []);
      } catch {
        if (!controller.signal.aborted) setPlaces([]);
      } finally {
        setPlacesLoading(false);
      }
    }, 220);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [panel, placeQuery]);

  useEffect(() => {
    if (panel !== "gif") return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setGifsLoading(true);
      try {
        const res = await fetch(`/api/feed/gifs?q=${encodeURIComponent(gifQuery)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { results?: GifItem[] };
        setGifs(data.results ?? []);
      } catch {
        if (!controller.signal.aborted) setGifs([]);
      } finally {
        setGifsLoading(false);
      }
    }, 160);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [panel, gifQuery]);

  function dismiss(persist: boolean) {
    if (isModal) {
      // CreatePostModal asks before closing mid-upload.
      onClose?.();
      return;
    }
    if (mediaBusy && !window.confirm(LEAVE_DURING_UPLOAD_MESSAGE)) return;
    clearMedia();
    setVisible(false);
    if (!persist) return;
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
  }

  function openPanel(next: ComposerPanel) {
    setPanel((current) => (current === next ? null : next));
  }

  function createItemId() {
    nextItemIdRef.current += 1;
    return `media-${nextItemIdRef.current}`;
  }

  function updateItem(id: string, patch: Partial<ComposerItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function revokeItemBlob(id: string) {
    const blobUrl = itemBlobUrlsRef.current.get(id);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    itemBlobUrlsRef.current.delete(id);
  }

  function releasePoster(id: string) {
    posterControllersRef.current.get(id)?.abort();
    posterControllersRef.current.delete(id);
    const posterBlob = posterBlobUrlsRef.current.get(id);
    if (posterBlob) URL.revokeObjectURL(posterBlob);
    posterBlobUrlsRef.current.delete(id);
    autoPosterUrlsRef.current.delete(id);
    customPosterIdsRef.current.delete(id);
  }

  /** Stops the item's upload and frees its preview. Uploaded files are left for the orphan sweep. */
  function releaseItem(id: string) {
    itemControllersRef.current.get(id)?.abort();
    itemControllersRef.current.delete(id);
    revokeItemBlob(id);
    releasePoster(id);
  }

  function removeItem(id: string) {
    releaseItem(id);
    setItems((current) => current.filter((item) => item.id !== id));
    setEditingId((current) => (current === id ? null : current));
    setVideoEditingId((current) => (current === id ? null : current));
  }

  function clearMedia() {
    for (const id of Array.from(itemControllersRef.current.keys())) releaseItem(id);
    for (const id of Array.from(itemBlobUrlsRef.current.keys())) revokeItemBlob(id);
    for (const id of Array.from(posterControllersRef.current.keys())) releasePoster(id);
    for (const id of Array.from(posterBlobUrlsRef.current.keys())) releasePoster(id);
    autoPosterUrlsRef.current.clear();
    customPosterIdsRef.current.clear();
    setItems([]);
    setEditingId(null);
    setVideoEditingId(null);
    setMediaEditorOpen(false);
  }

  function isItemAlive(id: string, controller: AbortController) {
    return itemControllersRef.current.get(id) === controller && !controller.signal.aborted;
  }

  /** The upload has finished, so the stored URL replaces the local preview. */
  function finishItemUpload(id: string, patch: Partial<ComposerItem> & { url: string }) {
    itemControllersRef.current.delete(id);
    const keepsBlobPreview = patch.previewUrl === undefined;
    if (!keepsBlobPreview) revokeItemBlob(id);
    updateItem(id, { ...patch, status: "ready" });
  }

  /** Uploads the poster frame through the photo path, so it gets the same safety check as photos. */
  async function uploadVideoPoster(poster: Blob, videoName: string, signal: AbortSignal) {
    const body = new FormData();
    const baseName = videoName.replace(/\.[^.]+$/, "") || "video";
    body.append("file", new File([poster], `${baseName}-poster.jpg`, { type: "image/jpeg" }));
    try {
      const response = await fetch("/api/feed/uploads", { method: "POST", body, signal });
      const data = (await response.json().catch(() => ({}))) as {
        url?: string;
        moderation?: UploadModerationPayload;
      };
      if (response.status === 422 && data.moderation) {
        // When the check itself is unavailable, post without a poster instead of blocking the video.
        if (data.moderation.verificationFailed) return { url: null, block: null };
        return { url: null, block: uploadModerationToBlock(data.moderation) };
      }
      return { url: response.ok && data.url ? data.url : null, block: null };
    } catch {
      return { url: null, block: null };
    }
  }

  async function uploadVideoItem(id: string, file: File, previewUrl: string, controller: AbortController) {
    const isCurrent = () => isItemAlive(id, controller);
    const update = (patch: Partial<ComposerItem>) => {
      if (isCurrent()) updateItem(id, patch);
    };
    const fail = (warning: VideoValidationError) => {
      if (itemControllersRef.current.get(id) !== controller) return;
      removeItem(id);
      setVideoWarning(warning);
    };

    try {
      const details = await inspectVideo(previewUrl);
      if (!isCurrent()) return;
      const tooLong = validateVideoDuration(details.duration);
      if (tooLong) {
        fail(tooLong);
        return;
      }

      update({ status: "uploading" });
      const posterUpload = details.poster
        ? uploadVideoPoster(details.poster, file.name, controller.signal)
        : Promise.resolve({ url: null, block: null });
      void posterUpload.then(({ block }) => {
        if (block && !customPosterIdsRef.current.has(id)) {
          fail({
            title: block.title,
            message: `${block.message} The video's thumbnail was flagged, so the video was not added to your post.`,
          });
        }
      });

      const url = await uploadVideoFile(file, {
        signal: controller.signal,
        onProgress: ({ loaded, total, retrying }) =>
          update({
            status: retrying ? "retrying" : "uploading",
            progress: total > 0 ? Math.min(100, Math.floor((loaded / total) * 100)) : 0,
          }),
      });
      update({ status: "processing", progress: 100 });

      const poster = await posterUpload;
      if (!isCurrent()) return;
      const customPoster = customPosterIdsRef.current.has(id);
      if (poster.block && !customPoster) return;
      autoPosterUrlsRef.current.set(id, poster.url);
      finishItemUpload(id, customPoster ? { url } : { url, posterUrl: poster.url });
    } catch (cause) {
      if (!isCurrent()) return;
      fail({
        title: "Upload failed",
        message: cause instanceof Error ? cause.message : "Unable to upload that video.",
      });
    }
  }

  /** Photos run one at a time: safety check, then upload. A blocked photo is dropped; the rest continue. */
  async function uploadPhotoItems(entries: { id: string; file: File; controller: AbortController }[]) {
    for (const { id, file, controller } of entries) {
      if (!isItemAlive(id, controller)) continue;
      let passToken: string | undefined;
      if (shouldModerateUploadFile(file)) {
        const moderation = await moderateImageFile(file);
        if (!isItemAlive(id, controller)) continue;
        if (!moderation.result.allowed) {
          removeItem(id);
          setImageWarning(moderation.result);
          continue;
        }
        passToken = moderation.passToken ?? undefined;
      }

      updateItem(id, { status: "uploading" });
      const body = new FormData();
      body.append("file", file);
      if (passToken) body.append("moderationPassToken", passToken);
      try {
        const response = await fetch("/api/feed/uploads", { method: "POST", body, signal: controller.signal });
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          url?: string;
          moderation?: UploadModerationPayload;
        };
        if (!isItemAlive(id, controller)) continue;
        if (response.status === 422 && data.moderation) {
          removeItem(id);
          setImageWarning(uploadModerationToBlock(data.moderation));
          continue;
        }
        if (!response.ok || !data.url) {
          removeItem(id);
          setError(data.error ?? "Unable to upload that file.");
          continue;
        }
        finishItemUpload(id, { url: data.url, previewUrl: data.url });
      } catch {
        if (!isItemAlive(id, controller)) continue;
        removeItem(id);
        setError("Unable to upload that file.");
      }
    }
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;

    const picked = Array.from(fileList);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setError("");
    setImageWarning(null);
    setVideoWarning(null);
    setPanel("photo");

    const room = MAX_POST_MEDIA_ITEMS - items.length;
    if (room <= 0) {
      setError(`A post can have up to ${MAX_POST_MEDIA_ITEMS} photos and videos.`);
      return;
    }

    const accepted: File[] = [];
    let invalidVideo: VideoValidationError | null = null;
    for (const file of picked) {
      if (looksLikeVideoFile(file)) {
        const invalid = validateVideoFile(file);
        if (invalid) {
          invalidVideo ??= invalid;
          continue;
        }
      }
      accepted.push(file);
    }
    if (invalidVideo) setVideoWarning(invalidVideo);

    const files = accepted.slice(0, room);
    if (accepted.length > room) {
      setError(
        `A post can have up to ${MAX_POST_MEDIA_ITEMS} photos and videos, so only the first ${room} ${
          room === 1 ? "file was" : "files were"
        } added.`,
      );
    }
    if (!files.length) return;

    const photos: { id: string; file: File; controller: AbortController }[] = [];
    const videos: { id: string; file: File; controller: AbortController; previewUrl: string }[] = [];
    const added: ComposerItem[] = files.map((file) => {
      const id = createItemId();
      const controller = new AbortController();
      const previewUrl = URL.createObjectURL(file);
      itemControllersRef.current.set(id, controller);
      itemBlobUrlsRef.current.set(id, previewUrl);
      const isVideo = looksLikeVideoFile(file);
      if (isVideo) {
        videos.push({ id, file, controller, previewUrl });
      } else {
        photos.push({ id, file, controller });
      }
      return {
        id,
        kind: isVideo ? "video" : "image",
        name: file.name,
        caption: "",
        url: null,
        previewUrl,
        posterUrl: null,
        status: isVideo ? "preparing" : "checking",
        progress: 0,
        videoEdit: null,
        posterPreviewUrl: null,
        posterUploading: false,
      };
    });
    setItems((current) => [...current, ...added]);
    for (const video of videos) void uploadVideoItem(video.id, video.file, video.previewUrl, video.controller);
    if (photos.length) void uploadPhotoItems(photos);
  }

  function addGif(gif: GifItem) {
    const replacing = gifItem;
    if (!replacing && items.length >= MAX_POST_MEDIA_ITEMS) {
      setError(`A post can have up to ${MAX_POST_MEDIA_ITEMS} photos and videos.`);
      return;
    }
    const next: ComposerItem = {
      id: createItemId(),
      kind: "gif",
      name: gif.alt,
      caption: replacing?.caption ?? "",
      url: gif.url,
      previewUrl: gif.url,
      posterUrl: null,
      status: "ready",
      progress: 100,
      videoEdit: null,
      posterPreviewUrl: null,
      posterUploading: false,
    };
    setItems((current) =>
      replacing ? current.map((item) => (item.id === replacing.id ? next : item)) : [...current, next],
    );
  }

  async function saveEditedImage(file: File) {
    if (!editingItem) return;
    const editedId = editingItem.id;

    setError("");
    setImageWarning(null);
    setSavingEdit(true);
    try {
      await saveEditedImageFor(editedId, file);
    } finally {
      setSavingEdit(false);
    }
  }

  async function saveEditedImageFor(editedId: string, file: File) {
    const { result, passToken } = await moderateImageFile(file);
    if (!result.allowed) {
      setImageWarning(result);
      throw new Error(formatImageModerationError(result));
    }

    const body = new FormData();
    body.append("file", file);
    if (passToken) body.append("moderationPassToken", passToken);
    const response = await fetch("/api/feed/uploads", { method: "POST", body });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      url?: string;
      moderation?: UploadModerationPayload;
    };
    if (response.status === 422 && data.moderation) {
      const block = uploadModerationToBlock(data.moderation);
      setImageWarning(block);
      throw new Error(formatImageModerationError(block));
    }
    if (!response.ok || !data.url) {
      throw new Error(data.error ?? "Unable to save the edited photo.");
    }
    revokeItemBlob(editedId);
    updateItem(editedId, { url: data.url, previewUrl: data.url });
    setEditingId(null);
  }

  function openVideoEditor(id: string, opener: HTMLElement) {
    videoEditorOpenerRef.current = opener;
    setVideoEditingId(id);
  }

  /** Trim applies straight away; a new thumbnail uploads in the background and falls back on failure. */
  function applyVideoEdit(id: string, result: VideoEditResult) {
    setVideoEditingId(null);
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    const { poster, ...editState } = result;
    if (!poster) {
      updateItem(id, { videoEdit: editState });
      return;
    }

    setError("");
    posterControllersRef.current.get(id)?.abort();
    const controller = new AbortController();
    posterControllersRef.current.set(id, controller);
    // Fall back to the last thumbnail that finished saving, not one that is still uploading.
    const savedPreviewUrl = posterBlobUrlsRef.current.get(id) ?? null;
    const previous = {
      posterUrl: item.posterUrl,
      posterPreviewUrl: savedPreviewUrl,
      thumbnailTime: savedPreviewUrl ? (item.videoEdit?.thumbnailTime ?? null) : null,
      custom: savedPreviewUrl !== null,
    };
    const previewUrl = URL.createObjectURL(poster);
    customPosterIdsRef.current.add(id);
    updateItem(id, { videoEdit: editState, posterPreviewUrl: previewUrl, posterUploading: true });

    void (async () => {
      const upload = await uploadVideoPoster(poster, item.name, controller.signal);
      if (posterControllersRef.current.get(id) !== controller) {
        URL.revokeObjectURL(previewUrl);
        return;
      }
      posterControllersRef.current.delete(id);

      if (upload.url) {
        const replaced = posterBlobUrlsRef.current.get(id);
        if (replaced) URL.revokeObjectURL(replaced);
        posterBlobUrlsRef.current.set(id, previewUrl);
        updateItem(id, { posterUrl: upload.url, posterUploading: false });
        return;
      }

      URL.revokeObjectURL(previewUrl);
      if (!previous.custom) customPosterIdsRef.current.delete(id);
      updateItem(id, {
        posterUploading: false,
        posterPreviewUrl: previous.posterPreviewUrl,
        posterUrl: previous.custom ? previous.posterUrl : (autoPosterUrlsRef.current.get(id) ?? null),
        videoEdit: { ...editState, thumbnailTime: previous.thumbnailTime },
      });
      setError(
        upload.block
          ? `${upload.block.title}: that thumbnail can't be used, so the previous one was kept.`
          : "We couldn't save the new thumbnail, so the previous one was kept. Try again.",
      );
    })();
  }

  function toggleCrossPostPlatform(id: CrossPostPlatformId) {
    setCrossPostPlatforms((current) => ({ ...current, [id]: !current[id] }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setTextWarning(null);
    if (mediaBusy || items.some((item) => !item.url)) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/feed/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          items: items.map((item) => ({
            type: item.kind === "video" ? "video" : "image",
            url: item.url,
            poster: item.posterUrl,
            trim: item.kind === "video" ? (item.videoEdit?.trim ?? null) : null,
            alt: item.name,
            caption: item.caption.trim(),
          })),
          feeling,
          location: location
            ? { label: location.label, lat: location.lat, lng: location.lng }
            : null,
          tagged: tagged.map((person) => ({
            name: person.name,
            handle: person.handle,
            slug: person.slug,
          })),
          membersOnly: verified ? exclusiveContent : false,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        profileHref?: string | null;
        moderation?: UploadModerationPayload;
      };
      if (response.status === 422 && data.moderation) {
        const block = uploadModerationToBlock(data.moderation);
        setTextWarning(block);
        setError("");
        return;
      }
      if (!response.ok) {
        setError(data.error ?? "Unable to publish your post.");
        return;
      }
      setImageWarning(null);
      setTextWarning(null);
      try {
        window.localStorage.setItem(storageKey, "1");
      } catch {
        /* ignore */
      }
      if (isModal) {
        onClose?.();
        router.refresh();
        return;
      }
      setPublishedHref(data.profileHref || profileHref);
    } catch {
      setError("Unable to publish your post.");
    } finally {
      setSubmitting(false);
    }
  }

  if (publishedHref) {
    if (isModal) {
      return (
        <aside className="first-post-prompt first-post-prompt--done" aria-live="polite">
          <strong className="first-post-prompt__title">Your first post is live</strong>
          <p className="first-post-prompt__text">People will see it on your public profile.</p>
          <Link href={publishedHref} className="btn btn--primary btn--sm first-post-prompt__cta">
            View profile
          </Link>
        </aside>
      );
    }
    return (
      <ShareOnSocialPrompt
        firstName={firstName}
        profileHref={publishedHref}
        dismissKey={dismissKey}
      />
    );
  }

  if (!visible) return null;

  const collage = mosaicLayout(items.length);

  /** Shown both under the composer and inside the Photos/Videos screen; only the visible copy takes the scroll ref. */
  function renderMediaWarnings(attachRef: boolean) {
    const ref = attachRef ? imageWarningRef : undefined;
    if (imageWarning) {
      return (
        <div ref={ref} className="composer-image-warning" role="alert" aria-live="assertive">
          <strong className="composer-image-warning__title">{imageWarning.title}</strong>
          <p className="composer-image-warning__body">{imageWarning.message}</p>
          <p className="composer-image-warning__meta">
            {imageWarning.verificationFailed
              ? "This photo was not added to your post."
              : `Flagged as ${imageWarning.category.toLowerCase()} (severity ${Math.round(imageWarning.confidence * 6)}/6). This photo was not added to your post.`}
          </p>
        </div>
      );
    }
    if (videoWarning) {
      return (
        <div ref={ref} className="composer-image-warning" role="alert" aria-live="assertive">
          <strong className="composer-image-warning__title">{videoWarning.title}</strong>
          <p className="composer-image-warning__body">{videoWarning.message}</p>
          <p className="composer-image-warning__meta">
            Videos can be MP4, MOV, or WebM, up to {formatByteLimit(VIDEO_MAX_BYTES)} and 240 minutes.
          </p>
        </div>
      );
    }
    return null;
  }

  return (
    <aside
      ref={rootRef}
      className={`first-post-prompt${isModal ? " first-post-prompt--modal" : ""}${dropActive ? " is-drop-target" : ""}${
        mediaEditorOpen ? " is-editing-media" : ""
      }`}
      aria-labelledby={mediaEditorOpen ? mediaEditorTitleId : titleId}
      data-video-uploading={mediaBusy ? "true" : undefined}
      onDragOver={(event) => {
        if (submitting || !event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setDropActive(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropActive(false);
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        setDropActive(false);
        if (!submitting) handleFiles(event.dataTransfer.files);
      }}
    >
      <input
        id={fileInputId}
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.mp4,.m4v,.mov,.webm"
        multiple
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => handleFiles(event.target.files)}
      />

      {mediaEditorOpen ? (
        <section className="composer-media-editor" aria-labelledby={mediaEditorTitleId}>
          <header className="composer-media-editor__head">
            <button
              ref={mediaEditorBackRef}
              type="button"
              className="composer-media-editor__back"
              aria-label="Back to post"
              onClick={() => setMediaEditorOpen(false)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5" />
                <path d="m11 18-6-6 6-6" />
              </svg>
            </button>
            <h2 id={mediaEditorTitleId} className="composer-media-editor__title">
              Photos/Videos
            </h2>
          </header>
          <div className="composer-media-editor__body">
            {items.length ? (
              <ul className="composer-media-editor__grid">
                {items.map((item, index) => {
                  const label = itemLabel(item, index);
                  const captionId = `${mediaEditorTitleId}-caption-${item.id}`;
                  return (
                    <li key={item.id} className="composer-media-card">
                      <div className="composer-media-card__media">
                        <ComposerItemThumb item={item} />
                        <ComposerItemProgress item={item} />
                        {item.kind === "video" || (item.kind === "image" && item.status === "ready") ? (
                          <button
                            type="button"
                            className="composer-media-card__edit"
                            aria-label={`Edit ${label}`}
                            onClick={(event) =>
                              item.kind === "video"
                                ? openVideoEditor(item.id, event.currentTarget)
                                : setEditingId(item.id)
                            }
                            disabled={submitting}
                          >
                            <PencilIcon />
                            Edit
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="composer-media-card__remove"
                          aria-label={item.status === "ready" ? `Remove ${label}` : `Cancel upload of ${label}`}
                          onClick={() => removeItem(item.id)}
                          disabled={submitting}
                        >
                          <CloseIcon />
                        </button>
                      </div>
                      <label className="sr-only" htmlFor={captionId}>
                        Caption for {label}
                      </label>
                      <textarea
                        id={captionId}
                        className="composer-media-card__caption"
                        placeholder="Caption"
                        rows={2}
                        maxLength={MAX_MEDIA_CAPTION_LENGTH}
                        value={item.caption}
                        onChange={(event) => updateItem(item.id, { caption: event.target.value })}
                      />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="composer-media-editor__empty">No photos or videos yet.</p>
            )}
            {savingEdit ? <ComposerImageStatus kind="checking" /> : null}
            {renderMediaWarnings(mediaEditorOpen)}
            {error ? <p className="first-post-prompt__error">{error}</p> : null}
          </div>
          <footer className="composer-media-editor__foot">
            <button
              type="button"
              className="composer-media-editor__add"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting || items.length >= MAX_POST_MEDIA_ITEMS}
            >
              <PhotoIcon />
              Add photos/videos
            </button>
            <button
              type="button"
              className="btn btn--primary btn--sm composer-media-editor__done"
              onClick={() => setMediaEditorOpen(false)}
            >
              Done
            </button>
          </footer>
        </section>
      ) : null}

      <div className="first-post-prompt__head" hidden={mediaEditorOpen}>
        <button
          type="button"
          className="first-post-prompt__dismiss"
          aria-label="Close"
          onClick={() => dismiss(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      {isModal ? (
        <h2 id={titleId} className="first-post-prompt__title" hidden={mediaEditorOpen}>
          Create post
        </h2>
      ) : (
        <>
          <p className="first-post-prompt__eyebrow" hidden={mediaEditorOpen}>
            Profile setup · Next step
          </p>
          <h2 id={titleId} className="first-post-prompt__title" hidden={mediaEditorOpen}>
            {firstName ? `${firstName}, share your first post` : "Share your first post"}
          </h2>
          <p className="first-post-prompt__text" hidden={mediaEditorOpen}>
            Your profile is ready. Write a short update so people have something to find when they visit.
          </p>
        </>
      )}
      <form className="first-post-prompt__form" onSubmit={(event) => void submit(event)} hidden={mediaEditorOpen}>
        <label className="sr-only" htmlFor={textId}>
          {isModal ? "Post" : "First post"}
        </label>
        <textarea
          id={textId}
          className="first-post-prompt__input"
          rows={3}
          maxLength={2000}
          placeholder={firstName ? `What’s on your mind, ${firstName}?` : "What’s on your mind?"}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            if (textWarning) setTextWarning(null);
          }}
          disabled={submitting}
          aria-invalid={Boolean(textWarning)}
        />

        {textWarning ? (
          <div ref={textWarningRef} className="composer-image-warning" role="alert" aria-live="assertive">
            <strong className="composer-image-warning__title">{textWarning.title}</strong>
            <p className="composer-image-warning__body">{textWarning.message}</p>
            <p className="composer-image-warning__meta">
              {textWarning.verificationFailed
                ? "Your post was not published. Edit the text and try again."
                : `Flagged as ${textWarning.category.toLowerCase()} (severity ${Math.round(textWarning.confidence * 6)}/6). Your post was not published.`}
            </p>
          </div>
        ) : null}

        {hasAttachment ? (
          <div className="composer-chips" aria-label="Added to this post">
            {feeling ? (
              <button type="button" className="composer-chip" onClick={() => setFeeling(null)}>
                {feeling.emoji} {feeling.kind === "activity" ? feeling.label : `Feeling ${feeling.label}`}
                <span aria-hidden="true">×</span>
              </button>
            ) : null}
            {location ? (
              <button type="button" className="composer-chip" onClick={() => setLocation(null)}>
                📍 {location.label.split(",")[0]}
                <span aria-hidden="true">×</span>
              </button>
            ) : null}
            {tagged.map((person) => (
              <button
                key={person.id}
                type="button"
                className="composer-chip"
                onClick={() => setTagged((current) => current.filter((item) => item.id !== person.id))}
              >
                {person.name}
                <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="composer-collage">
            <div className={`composer-collage__grid ${collage.className}`}>
              {items.slice(0, collage.visible).map((item, index) => {
                const moreCount = index === collage.visible - 1 ? collage.hidden : 0;
                return (
                  <div
                    key={item.id}
                    className={`composer-collage__tile${item.kind === "video" ? " composer-collage__tile--video" : ""}`}
                  >
                    <ComposerItemThumb item={item} />
                    <ComposerItemProgress item={item} />
                    {moreCount ? (
                      <span className="media-mosaic__more">
                        +{moreCount}
                        <span className="sr-only"> more</span>
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <button
              ref={collageEditRef}
              type="button"
              className="composer-collage__edit"
              onClick={(event) =>
                items.length === 1 && items[0].kind === "video"
                  ? openVideoEditor(items[0].id, event.currentTarget)
                  : setMediaEditorOpen(true)
              }
              disabled={submitting}
            >
              <PencilIcon />
              {items.length > 1 ? "Edit all" : "Edit"}
            </button>
            <button
              type="button"
              className="composer-collage__clear"
              aria-label="Remove all photos and videos"
              title="Remove all"
              onClick={clearMedia}
              disabled={submitting}
            >
              <CloseIcon />
            </button>
          </div>
        ) : null}

        <div className="add-to-post">
          <span className="add-to-post__label">Add to your post</span>
          <div className="add-to-post__icons">
            <button
              type="button"
              className={`add-to-post__icon add-to-post__icon--photo${
                panel === "photo" || items.some((item) => item.kind !== "gif") ? " is-active" : ""
              }`}
              aria-label="Photo/video"
              title="Photo/video"
              onClick={() => {
                fileInputRef.current?.click();
                setPanel("photo");
              }}
            >
              <PhotoIcon />
            </button>
            <button
              type="button"
              className={`add-to-post__icon add-to-post__icon--tag${panel === "tag" || tagged.length ? " is-active" : ""}`}
              aria-label="Tag people"
              title="Tag people"
              onClick={() => openPanel("tag")}
            >
              <TagIcon />
            </button>
            <button
              type="button"
              className={`add-to-post__icon add-to-post__icon--feeling${panel === "feeling" || feeling ? " is-active" : ""}`}
              aria-label="Feeling/activity"
              title="Feeling/activity"
              onClick={() => openPanel("feeling")}
            >
              <FeelingIcon />
            </button>
            <button
              type="button"
              className={`add-to-post__icon add-to-post__icon--location${panel === "location" || location ? " is-active" : ""}`}
              aria-label="Check in"
              title="Check in"
              onClick={() => openPanel("location")}
            >
              <LocationIcon />
            </button>
            <button
              type="button"
              className={`add-to-post__icon add-to-post__icon--gif${panel === "gif" || gifItem ? " is-active" : ""}`}
              aria-label="GIF"
              title="GIF"
              onClick={() => openPanel("gif")}
            >
              <GifIcon />
            </button>
            <button
              type="button"
              className={`add-to-post__icon add-to-post__icon--more${panel === "more" ? " is-active" : ""}`}
              aria-label="More"
              title="More"
              onClick={() => openPanel("more")}
            >
              <MoreIcon />
            </button>
          </div>
        </div>

        {savingEdit ? <ComposerImageStatus kind="checking" /> : null}

        {renderMediaWarnings(!mediaEditorOpen)}

        {panel === "tag" ? (
          <div className="composer-panel">
            <p className="composer-panel__title">Tag people</p>
            <input
              className="composer-panel__search"
              value={peopleQuery}
              onChange={(event) => setPeopleQuery(event.target.value)}
              placeholder="Who are you with?"
            />
            {peopleLoading ? <p className="composer-panel__status">Searching…</p> : null}
            <ul className="composer-panel__list">
              {people.map((person) => {
                const selected = tagged.some((item) => item.id === person.id);
                return (
                  <li key={person.id}>
                    <button
                      type="button"
                      className={`composer-person${selected ? " is-selected" : ""}`}
                      onClick={() =>
                        setTagged((current) =>
                          selected
                            ? current.filter((item) => item.id !== person.id)
                            : [...current, person].slice(0, 8),
                        )
                      }
                    >
                      <span
                        className="composer-person__avatar"
                        style={{ "--story-color": person.avatarColor } as CSSProperties}
                      >
                        {person.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={person.avatarUrl} alt="" />
                        ) : (
                          person.avatarInitials
                        )}
                      </span>
                      <span className="composer-person__copy">
                        <strong>{person.name}</strong>
                        <span>{person.handle}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {!peopleLoading && peopleQuery.trim() && people.length === 0 ? (
              <p className="composer-panel__status">No people match that search.</p>
            ) : null}
          </div>
        ) : null}

        {panel === "feeling" ? (
          <div className="composer-panel">
            <p className="composer-panel__title">How are you feeling?</p>
            <div className="composer-feelings">
              {COMPOSER_FEELINGS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={`composer-feeling${feeling?.label === item.label ? " is-selected" : ""}`}
                  onClick={() => {
                    setFeeling(item);
                    setPanel(null);
                  }}
                >
                  <span>{item.emoji}</span>
                  {item.label}
                </button>
              ))}
            </div>
            <p className="composer-panel__title">Activity</p>
            <div className="composer-feelings">
              {COMPOSER_ACTIVITIES.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={`composer-feeling${feeling?.label === item.label ? " is-selected" : ""}`}
                  onClick={() => {
                    setFeeling(item);
                    setPanel(null);
                  }}
                >
                  <span>{item.emoji}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {panel === "location" ? (
          <div className="composer-panel">
            <p className="composer-panel__title">Check in</p>
            <input
              className="composer-panel__search"
              value={placeQuery}
              onChange={(event) => setPlaceQuery(event.target.value)}
              placeholder="Where are you?"
            />
            {placesLoading ? <p className="composer-panel__status">Searching places…</p> : null}
            <ul className="composer-panel__list">
              {places.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    className="composer-person"
                    onClick={() => {
                      setLocation(place);
                      setPanel(null);
                    }}
                  >
                    <span className="composer-person__pin" aria-hidden="true">
                      <LocationIcon />
                    </span>
                    <span className="composer-person__copy">
                      <strong>{place.label.split(",")[0]}</strong>
                      <span>{place.label}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {!placesLoading && placeQuery.trim().length >= 2 && places.length === 0 ? (
              <p className="composer-panel__status">No places found. Try a city or venue name.</p>
            ) : null}
          </div>
        ) : null}

        {panel === "gif" ? (
          <div className="composer-panel">
            <p className="composer-panel__title">Choose a GIF</p>
            <input
              className="composer-panel__search"
              value={gifQuery}
              onChange={(event) => setGifQuery(event.target.value)}
              placeholder="Search GIFs"
            />
            {gifsLoading ? <p className="composer-panel__status">Loading GIFs…</p> : null}
            <div className="composer-gifs">
              {gifs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`composer-gifs__item${gifItem?.url === item.url ? " is-selected" : ""}`}
                  onClick={() => {
                    addGif(item);
                    setPanel(null);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={item.alt} />
                </button>
              ))}
            </div>
            {!gifsLoading && gifs.length === 0 ? (
              <p className="composer-panel__status">No GIFs match that search.</p>
            ) : null}
          </div>
        ) : null}

        {panel === "more" ? (
          <div className="composer-panel">
            <p className="composer-panel__title">Add to your post</p>
            <div className="composer-more">
              {(
                [
                  ["photo", "Photo/video", "add-to-post__icon--photo", <PhotoIcon key="p" />],
                  ["tag", "Tag people", "add-to-post__icon--tag", <TagIcon key="t" />],
                  ["feeling", "Feeling/activity", "add-to-post__icon--feeling", <FeelingIcon key="f" />],
                  ["location", "Check in", "add-to-post__icon--location", <LocationIcon key="l" />],
                  ["gif", "GIF", "add-to-post__icon--gif", <GifIcon key="g" />],
                ] as const
              ).map(([id, label, colorClass, icon]) => (
                <button
                  key={id}
                  type="button"
                  className="composer-more__item"
                  onClick={() => {
                    if (id === "photo") {
                      fileInputRef.current?.click();
                      setPanel("photo");
                      return;
                    }
                    setPanel(id);
                  }}
                >
                  <span className={`add-to-post__icon ${colorClass}`} aria-hidden="true">
                    {icon}
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {error ? <p className="first-post-prompt__error">{error}</p> : null}
        {verified ? (
          <label className="composer-exclusive">
            <input
              type="checkbox"
              checked={exclusiveContent}
              onChange={(event) => setExclusiveContent(event.target.checked)}
              disabled={submitting}
            />
            <span>
              <strong>Exclusive content</strong>
              <span>Only subscribers can unlock this post.</span>
            </span>
          </label>
        ) : null}
        <fieldset className="composer-crosspost">
          <legend className="composer-crosspost__legend">Also push to</legend>
          <p className="composer-crosspost__hint">
            Select other platforms to share this post. Cross-posting is not live yet.
          </p>
          <div className="composer-crosspost__platforms" role="group" aria-label="Cross-post platforms">
            {CROSS_POST_PLATFORMS.map((platform) => {
              const selected = crossPostPlatforms[platform.id];
              return (
                <button
                  key={platform.id}
                  type="button"
                  className={`composer-crosspost__platform${selected ? " is-selected" : ""}`}
                  aria-pressed={selected}
                  disabled={submitting}
                  onClick={() => toggleCrossPostPlatform(platform.id)}
                >
                  <span className="composer-crosspost__platform-icon">{platform.icon}</span>
                  {platform.label}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="first-post-prompt__meta">
          <p className="first-post-prompt__hint">
            Add up to {MAX_POST_MEDIA_ITEMS} photos and videos in any mix. Tags, places, feelings, and GIFs are
            optional.
          </p>
          <div className="first-post-prompt__actions">
            {isModal ? null : (
              <button type="button" className="first-post-prompt__later" onClick={() => dismiss(false)}>
                Maybe later
              </button>
            )}
            <button
              type="submit"
              className="btn btn--primary btn--sm first-post-prompt__cta"
              disabled={submitting || savingEdit || mediaBusy || !canPost}
            >
              {submitting ? "Posting…" : mediaBusy ? "Uploading…" : "Post"}
            </button>
          </div>
        </div>
      </form>
      {editingItem ? (
        <ComposerImageEditor
          src={editingItem.previewUrl}
          onCancel={() => setEditingId(null)}
          onSave={saveEditedImage}
        />
      ) : null}
      {videoEditingItem ? (
        <ComposerVideoEditor
          key={videoEditingItem.id}
          src={videoEditingItem.previewUrl}
          name={videoEditingItem.name}
          initial={videoEditingItem.videoEdit}
          onCancel={() => setVideoEditingId(null)}
          onDone={(result) => applyVideoEdit(videoEditingItem.id, result)}
        />
      ) : null}
    </aside>
  );
}

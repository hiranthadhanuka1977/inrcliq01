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
import ShareOnSocialPrompt from "@/components/feed/account/ShareOnSocialPrompt";
import {
  formatImageModerationError,
  moderateImageFile,
  preloadImageModerationModel,
  shouldModerateUploadFile,
  type ImageModerationBlock,
} from "@/lib/moderation/nsfw-image-moderation";

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

type MediaItem = {
  url: string;
  alt: string;
  kind: "image" | "video";
  moderationPassed: boolean;
};

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
  const [uploading, setUploading] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [publishedHref, setPublishedHref] = useState<string | null>(null);
  const [panel, setPanel] = useState<ComposerPanel>(null);

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [tagged, setTagged] = useState<TaggedPerson[]>([]);
  const [feeling, setFeeling] = useState<FeelingPick | null>(null);
  const [location, setLocation] = useState<Checkin | null>(null);
  const [gif, setGif] = useState<GifItem | null>(null);
  const [editingUrl, setEditingUrl] = useState<string | null>(null);

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

  const hasAttachment = media.length > 0 || Boolean(gif) || Boolean(feeling) || Boolean(location) || tagged.length > 0;
  const canPost = Boolean(text.trim() || media.length || gif);

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
      onClose?.();
      return;
    }
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

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;

    const files = Array.from(fileList).slice(0, 6);
    setError("");
    setImageWarning(null);
    setPanel("photo");
    setModerating(true);

    let blocked: ImageModerationBlock | null = null;
    const passTokens = new Map<File, string>();
    try {
      for (const file of files) {
        if (!shouldModerateUploadFile(file)) continue;
        const { result, passToken } = await moderateImageFile(file);
        if (!result.allowed) {
          blocked = result;
          break;
        }
        if (passToken) passTokens.set(file, passToken);
      }
    } finally {
      setModerating(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

    if (blocked) {
      setImageWarning(blocked);
      return;
    }

    setUploading(true);
    try {
      for (const file of files) {
        const body = new FormData();
        body.append("file", file);
        const passToken = passTokens.get(file);
        if (passToken) body.append("moderationPassToken", passToken);
        const response = await fetch("/api/feed/uploads", { method: "POST", body });
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          url?: string;
          kind?: "image" | "video";
          moderation?: UploadModerationPayload;
        };
        if (response.status === 422 && data.moderation) {
          setImageWarning(uploadModerationToBlock(data.moderation));
          break;
        }
        if (!response.ok || !data.url) {
          setError(data.error ?? "Unable to upload that file.");
          break;
        }
        const uploadedUrl = data.url;
        const uploadedKind: MediaItem["kind"] = data.kind === "video" ? "video" : "image";
        setMedia((current): MediaItem[] => {
          if (uploadedKind === "video") {
            const videoItem: MediaItem = {
              url: uploadedUrl,
              alt: file.name,
              kind: "video",
              moderationPassed: true,
            };
            return [videoItem];
          }
          const withoutVideo = current.filter((item) => item.kind !== "video");
          const imageItem: MediaItem = {
            url: uploadedUrl,
            alt: file.name,
            kind: "image",
            moderationPassed: true,
          };
          return [...withoutVideo, imageItem].slice(0, 6);
        });
        if (data.kind === "video") break;
      }
    } finally {
      setUploading(false);
    }
  }

  async function saveEditedImage(file: File) {
    if (!editingUrl) return;
    const originalUrl = editingUrl;

    setError("");
    setImageWarning(null);
    setModerating(true);
    const { result, passToken } = await moderateImageFile(file);
    setModerating(false);
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
    setMedia((current) =>
      current.map((item) =>
        item.url === originalUrl
          ? { ...item, url: data.url!, moderationPassed: true }
          : item,
      ),
    );
    setEditingUrl(null);
  }

  function toggleCrossPostPlatform(id: CrossPostPlatformId) {
    setCrossPostPlatforms((current) => ({ ...current, [id]: !current[id] }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setTextWarning(null);
    const unverifiedImage = media.find((item) => item.kind === "image" && !item.moderationPassed);
    if (unverifiedImage) {
      setError("One or more photos did not pass the safety check. Remove them and try again.");
      return;
    }
    setSubmitting(true);
    try {
      const images = media
        .filter((item) => item.kind === "image")
        .map((item) => ({ url: item.url, alt: item.alt }));
      const video = media.find((item) => item.kind === "video");
      const response = await fetch("/api/feed/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          images,
          videoUrl: video?.url ?? null,
          gifUrl: gif?.url ?? null,
          gifAlt: gif?.alt ?? null,
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

  const previews = [
    ...media.map((item) => ({ key: item.url, url: item.url, alt: item.alt, kind: item.kind })),
    ...(gif ? [{ key: gif.id, url: gif.url, alt: gif.alt, kind: "image" as const }] : []),
  ];

  return (
    <aside
      ref={rootRef}
      className={`first-post-prompt${isModal ? " first-post-prompt--modal" : ""}`}
      aria-labelledby={titleId}
    >
      <div className="first-post-prompt__head">
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
        <h2 id={titleId} className="first-post-prompt__title">
          Create post
        </h2>
      ) : (
        <>
          <p className="first-post-prompt__eyebrow">Profile setup · Next step</p>
          <h2 id={titleId} className="first-post-prompt__title">
            {firstName ? `${firstName}, share your first post` : "Share your first post"}
          </h2>
          <p className="first-post-prompt__text">
            Your profile is ready. Write a short update so people have something to find when they visit.
          </p>
        </>
      )}
      <form className="first-post-prompt__form" onSubmit={(event) => void submit(event)}>
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

        {previews.length > 0 ? (
          <div className={`composer-previews${previews.length > 1 ? " composer-previews--grid" : ""}`}>
            {previews.map((item) => {
              const canEdit =
                item.kind === "image" && gif?.url !== item.url && !item.url.includes("giphy.com");
              return (
              <div key={item.key} className="composer-previews__item">
                {item.kind === "video" ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video src={item.url} controls playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.alt} />
                )}
                {canEdit ? (
                  <button
                    type="button"
                    className="composer-previews__edit"
                    onClick={() => setEditingUrl(item.url)}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                    </svg>
                    Edit
                  </button>
                ) : null}
                <button
                  type="button"
                  className="composer-previews__remove"
                  aria-label="Remove"
                  onClick={() => {
                    setMedia((current) => current.filter((entry) => entry.url !== item.url));
                    if (gif?.url === item.url) setGif(null);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
              );
            })}
          </div>
        ) : null}

        <input
          id={fileInputId}
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
          multiple
          onChange={(event) => void handleFiles(event.target.files)}
        />

        <div className="add-to-post">
          <span className="add-to-post__label">Add to your post</span>
          <div className="add-to-post__icons">
            <button
              type="button"
              className={`add-to-post__icon add-to-post__icon--photo${panel === "photo" || media.length ? " is-active" : ""}`}
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
              className={`add-to-post__icon add-to-post__icon--gif${panel === "gif" || gif ? " is-active" : ""}`}
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

        {moderating ? <ComposerImageStatus kind="checking" /> : null}
        {!moderating && uploading ? <ComposerImageStatus kind="uploading" /> : null}

        {imageWarning ? (
          <div ref={imageWarningRef} className="composer-image-warning" role="alert" aria-live="assertive">
            <strong className="composer-image-warning__title">{imageWarning.title}</strong>
            <p className="composer-image-warning__body">{imageWarning.message}</p>
            <p className="composer-image-warning__meta">
              {imageWarning.verificationFailed
                ? "This photo was not added to your post."
                : `Flagged as ${imageWarning.category.toLowerCase()} (severity ${Math.round(imageWarning.confidence * 6)}/6). This photo was not added to your post.`}
            </p>
          </div>
        ) : null}

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
                  className={`composer-gifs__item${gif?.id === item.id ? " is-selected" : ""}`}
                  onClick={() => {
                    setGif(item);
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
            Photos, tags, places, feelings, and GIFs are optional.
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
              disabled={submitting || uploading || moderating || !canPost}
            >
              {submitting ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      </form>
      {editingUrl ? (
        <ComposerImageEditor
          src={editingUrl}
          onCancel={() => setEditingUrl(null)}
          onSave={saveEditedImage}
        />
      ) : null}
    </aside>
  );
}

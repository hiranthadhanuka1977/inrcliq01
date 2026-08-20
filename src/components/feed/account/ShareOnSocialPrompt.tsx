"use client";

import { useEffect, useId, useState } from "react";

const STORAGE_KEY = "inrcliq:share-on-social-prompt-dismissed";

const PLATFORMS = [
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

function buildShareMessage(input: {
  firstName: string | null;
  handle: string | null;
  profileUrl: string;
}) {
  const name = input.firstName?.trim() || "I";
  const handle = input.handle?.trim()
    ? input.handle.startsWith("@")
      ? input.handle
      : `@${input.handle}`
    : null;
  const intro =
    name === "I"
      ? "I'm on INRCLIQ now"
      : `Hey — ${name} is on INRCLIQ now`;
  const handleLine = handle ? `\nFind me as ${handle}` : "";
  return `${intro}. Come say hi and follow along.${handleLine}\n\n${input.profileUrl}`;
}

function absoluteProfileUrl(profileHref: string | null) {
  if (!profileHref) return "";
  if (/^https?:\/\//i.test(profileHref)) return profileHref;
  if (typeof window === "undefined") return profileHref;
  return `${window.location.origin}${profileHref.startsWith("/") ? "" : "/"}${profileHref}`;
}

export default function ShareOnSocialPrompt({
  firstName,
  handle = null,
  profileHref = null,
  dismissKey = null,
}: {
  firstName: string | null;
  handle?: string | null;
  profileHref?: string | null;
  dismissKey?: string | null;
}) {
  const titleId = useId();
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  const storageKey = dismissKey ? `${STORAGE_KEY}:${dismissKey}` : STORAGE_KEY;

  useEffect(() => {
    try {
      if (window.localStorage.getItem(storageKey) === "1") return;
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, [storageKey]);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
  }

  async function copyShareText() {
    setCopyError("");
    const profileUrl = absoluteProfileUrl(profileHref);
    if (!profileUrl) {
      setCopyError("Your public profile link isn’t ready yet.");
      return;
    }
    const message = buildShareMessage({ firstName, handle, profileUrl });
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopyError("Couldn’t copy. Select the text manually and copy it.");
    }
  }

  if (!visible) return null;

  return (
    <aside className="first-post-prompt share-social-prompt" aria-labelledby={titleId}>
      <div className="first-post-prompt__head">
        <button
          type="button"
          className="first-post-prompt__dismiss"
          aria-label="Dismiss"
          onClick={dismiss}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p className="first-post-prompt__eyebrow">Profile setup · Next step</p>
      <h2 id={titleId} className="first-post-prompt__title">
        {firstName ? `${firstName}, tell your people` : "Tell your people"}
      </h2>
      <p className="first-post-prompt__text">
        Let friends on Facebook, Instagram, X, and LinkedIn know you’re on INRCLIQ. Share copies a
        ready-to-paste post with your profile link.
      </p>

      <ul className="share-social-prompt__platforms" aria-label="Share on these platforms">
        {PLATFORMS.map((platform) => (
          <li key={platform.id} className="share-social-prompt__platform">
            <span className="share-social-prompt__platform-icon">{platform.icon}</span>
            <span>{platform.label}</span>
          </li>
        ))}
      </ul>

      {copyError ? (
        <p className="first-post-prompt__error" role="alert">
          {copyError}
        </p>
      ) : null}

      <div className="first-post-prompt__meta share-social-prompt__meta">
        <p className="first-post-prompt__hint">
          {copied
            ? "Copied. Open Facebook, Instagram, X, or LinkedIn and paste."
            : "One tap copies the invite — then paste it where your people already are."}
        </p>
        <div className="first-post-prompt__actions">
          <button type="button" className="first-post-prompt__later" onClick={dismiss}>
            Maybe later
          </button>
          <button
            type="button"
            className="btn btn--primary btn--sm first-post-prompt__cta"
            onClick={() => void copyShareText()}
          >
            {copied ? "Copied" : "Share"}
          </button>
        </div>
      </div>
    </aside>
  );
}

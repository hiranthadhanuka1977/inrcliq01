"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

const STORAGE_KEY = "inrcliq:confirm-adult-prompt-dismissed";

export default function ConfirmAdultPrompt({
  firstName,
  dismissKey = null,
}: {
  firstName: string | null;
  dismissKey?: string | null;
}) {
  const titleId = useId();
  const [visible, setVisible] = useState(false);

  const storageKey = dismissKey ? `${STORAGE_KEY}:${dismissKey}` : STORAGE_KEY;

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(storageKey) !== "1");
    } catch {
      setVisible(true);
    }
  }, [storageKey]);

  function dismiss() {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside className="first-post-prompt confirm-adult-prompt" aria-labelledby={titleId}>
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
      <p className="first-post-prompt__eyebrow">Account · Next step</p>
      <h2 id={titleId} className="first-post-prompt__title">
        {firstName ? `${firstName}, confirm you are an adult` : "Confirm you are an adult"}
      </h2>
      <p className="first-post-prompt__text">
        Confirm with an ID and a selfie that you are 18 or older.
      </p>
      <div className="first-post-prompt__actions">
        <Link href="/feed/me/adult" className="btn btn--primary btn--sm first-post-prompt__cta">
          Confirm you are an Adult
        </Link>
        <button type="button" className="first-post-prompt__later" onClick={dismiss}>
          Later
        </button>
      </div>
    </aside>
  );
}

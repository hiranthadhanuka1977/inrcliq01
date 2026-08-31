"use client";

import { useEffect, useId, useState } from "react";

const STORAGE_KEY = "inrcliq:set-handle-prompt-dismissed";

export default function SetHandlePrompt({
  firstName,
  dismissKey = null,
  onSetHandle,
}: {
  firstName: string | null;
  dismissKey?: string | null;
  onSetHandle: () => void;
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
    <aside className="first-post-prompt set-handle-prompt" aria-labelledby={titleId}>
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
      <p className="first-post-prompt__eyebrow">Profile setup · First step</p>
      <h2 id={titleId} className="first-post-prompt__title">
        {firstName ? `${firstName}, choose your @handle` : "Choose your @handle"}
      </h2>
      <p className="first-post-prompt__text">
        Your handle is how people find and mention you on InrCliq. Pick one now so your profile is easy to share.
      </p>
      <div className="first-post-prompt__actions">
        <button type="button" className="btn btn--primary btn--sm first-post-prompt__cta" onClick={onSetHandle}>
          Set handle
        </button>
        <button type="button" className="first-post-prompt__later" onClick={dismiss}>
          Later
        </button>
      </div>
    </aside>
  );
}

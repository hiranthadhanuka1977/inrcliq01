"use client";

import { useEffect, useId, useState } from "react";
import CreatePostModal from "@/components/feed/account/CreatePostModal";

const STORAGE_KEY = "inrcliq:first-post-prompt-dismissed";

export default function FirstPostPromptCard({
  firstName,
  dismissKey = null,
  verified = false,
}: {
  firstName: string | null;
  dismissKey?: string | null;
  verified?: boolean;
}) {
  const titleId = useId();
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

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
    <>
      <aside className="first-post-prompt first-post-prompt-card" aria-labelledby={titleId}>
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
          {firstName ? `${firstName}, share your first post` : "Share your first post"}
        </h2>
        <p className="first-post-prompt__text">
          Your profile is ready. Write a short update so people have something to find when they visit.
        </p>
        <div className="first-post-prompt__actions first-post-prompt-card__actions">
          <button
            type="button"
            className="btn btn--outline-brand btn--sm first-post-prompt-card__cta"
            onClick={() => setModalOpen(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Create post
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={dismiss}>
            Maybe later
          </button>
        </div>
      </aside>

      <CreatePostModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        firstName={firstName}
        verified={verified}
      />
    </>
  );
}

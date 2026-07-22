"use client";

import { useCallback, useEffect, useState } from "react";

function UpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function getScrollY(): number {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

function scrollToY(top: number) {
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function scrollToElement(id: string) {
  const el = document.getElementById(id);
  if (!el) {
    scrollToY(0);
    return;
  }

  const top = el.getBoundingClientRect().top + getScrollY();
  scrollToY(top);
}

type ProfileScrollButtonProps = {
  variant: "profile";
  topTargetId: string;
  feedTargetId: string;
};

type HomeScrollButtonProps = {
  variant: "home";
  topTargetId: string;
  showAfterPx?: number;
};

type FeedScrollButtonProps = ProfileScrollButtonProps | HomeScrollButtonProps;

export default function FeedScrollButton(props: FeedScrollButtonProps) {
  const [isTopMode, setIsTopMode] = useState(props.variant === "home");
  const [isVisible, setIsVisible] = useState(props.variant === "profile");

  const updateMode = useCallback(() => {
    if (props.variant === "home") {
      const showAfter = props.showAfterPx ?? 480;
      setIsVisible(getScrollY() > showAfter);
      setIsTopMode(true);
      return;
    }

    const feedSection = document.getElementById(props.feedTargetId);
    if (!feedSection) return;

    const feedTop = feedSection.getBoundingClientRect().top;
    setIsTopMode(feedTop <= 120);
    setIsVisible(true);
  }, [props]);

  useEffect(() => {
    updateMode();
    window.addEventListener("scroll", updateMode, { passive: true });
    window.addEventListener("resize", updateMode);
    return () => {
      window.removeEventListener("scroll", updateMode);
      window.removeEventListener("resize", updateMode);
    };
  }, [updateMode]);

  if (!isVisible) return null;

  const handleClick = () => {
    if (props.variant === "profile" && !isTopMode) {
      scrollToElement(props.feedTargetId);
      return;
    }

    if (props.variant === "home") {
      scrollToY(0);
      return;
    }

    scrollToElement(props.topTargetId);
  };

  const ariaLabel = isTopMode ? "Back to top" : "Jump to the feed";

  return (
    <button
      type="button"
      className={`profile-jump-feed${isTopMode ? " is-top-mode" : ""}`}
      aria-label={ariaLabel}
      onClick={handleClick}
    >
      {props.variant === "profile" ? (
        <span className="profile-jump-feed__label">Jump to the feed</span>
      ) : null}
      <span className="profile-jump-feed__icon" aria-hidden="true">
        <UpIcon />
      </span>
    </button>
  );
}

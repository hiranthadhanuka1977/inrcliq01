"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatCount } from "@/lib/feed/format";

export type FeedReactionId = "love" | "like" | "care" | "haha" | "wow" | "sad" | "angry";

export const FEED_REACTIONS: { id: FeedReactionId; emoji: string; label: string }[] = [
  { id: "love", emoji: "❤️", label: "Love" },
  { id: "like", emoji: "👍", label: "Like" },
  { id: "care", emoji: "🤗", label: "Care" },
  { id: "haha", emoji: "😂", label: "Haha" },
  { id: "wow", emoji: "😮", label: "Wow" },
  { id: "sad", emoji: "😢", label: "Sad" },
  { id: "angry", emoji: "😠", label: "Angry" },
];

const DEFAULT_REACTION: FeedReactionId = "love";
const HOLD_MS = 450;
const HOVER_OPEN_MS = 120;
const HOVER_CLOSE_MS = 220;

type FeedReactionButtonProps = {
  count: number;
  reaction: FeedReactionId | null;
  onReactionChange: (next: FeedReactionId | null) => void;
  /** Compact control for comment rows; viewer for fullscreen side panel. */
  variant?: "post" | "comment" | "viewer";
};

export default function FeedReactionButton({
  count,
  reaction,
  onReactionChange,
  variant = "post",
}: FeedReactionButtonProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ left: number; top: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const hoverOpenTimerRef = useRef<number | null>(null);
  const hoverCloseTimerRef = useRef<number | null>(null);
  const holdTriggeredRef = useRef(false);
  const suppressClickRef = useRef(false);
  const isComment = variant === "comment";
  const isViewer = variant === "viewer";
  const usePortalPicker = isComment || isViewer;

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const clearHoverTimers = useCallback(() => {
    if (hoverOpenTimerRef.current !== null) {
      window.clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }
    if (hoverCloseTimerRef.current !== null) {
      window.clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  }, []);

  const updatePickerPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const pickerWidth = 280;
    // Anchor to the left of the button so width changes don't shift the bar.
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - pickerWidth - 8);
    const top = Math.max(8, rect.top - 10);
    setPickerPos((prev) => {
      if (prev && prev.left === left && prev.top === top) return prev;
      return { left, top };
    });
  }, []);

  const openPicker = useCallback(() => {
    clearHoverTimers();
    if (usePortalPicker) {
      updatePickerPosition();
    }
    setPickerOpen(true);
  }, [clearHoverTimers, updatePickerPosition, usePortalPicker]);

  const closePicker = useCallback(() => {
    clearHoverTimers();
    setPickerOpen(false);
  }, [clearHoverTimers]);

  const selectReaction = useCallback(
    (next: FeedReactionId) => {
      onReactionChange(reaction === next ? null : next);
      closePicker();
    },
    [closePicker, onReactionChange, reaction],
  );

  const handleQuickActivate = useCallback(() => {
    if (reaction) {
      onReactionChange(null);
    } else {
      onReactionChange(DEFAULT_REACTION);
    }
    closePicker();
  }, [closePicker, onReactionChange, reaction]);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    holdTriggeredRef.current = false;
    suppressClickRef.current = false;
    clearHoldTimer();
    holdTimerRef.current = window.setTimeout(() => {
      holdTriggeredRef.current = true;
      suppressClickRef.current = true;
      openPicker();
    }, HOLD_MS);
  };

  const handlePointerUp = () => {
    clearHoldTimer();
  };

  const handlePointerLeave = () => {
    clearHoldTimer();
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (suppressClickRef.current || holdTriggeredRef.current) {
      suppressClickRef.current = false;
      holdTriggeredRef.current = false;
      return;
    }
    handleQuickActivate();
  };

  const handleMouseEnter = () => {
    if (hoverCloseTimerRef.current !== null) {
      window.clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
    hoverOpenTimerRef.current = window.setTimeout(openPicker, HOVER_OPEN_MS);
  };

  const handleMouseLeave = () => {
    if (hoverOpenTimerRef.current !== null) {
      window.clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }
    hoverCloseTimerRef.current = window.setTimeout(closePicker, HOVER_CLOSE_MS);
  };

  useEffect(() => {
    return () => {
      clearHoldTimer();
      clearHoverTimers();
    };
  }, [clearHoldTimer, clearHoverTimers]);

  useLayoutEffect(() => {
    if (!pickerOpen || !usePortalPicker) return;
    updatePickerPosition();
    const onMove = () => updatePickerPosition();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [pickerOpen, updatePickerPosition, usePortalPicker]);

  useEffect(() => {
    if (!pickerOpen) return;

    const handlePointerDownOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || pickerRef.current?.contains(target)) {
        return;
      }
      closePicker();
    };

    document.addEventListener("pointerdown", handlePointerDownOutside);
    return () => document.removeEventListener("pointerdown", handlePointerDownOutside);
  }, [closePicker, pickerOpen]);

  const activeReaction = reaction ? FEED_REACTIONS.find((item) => item.id === reaction) : null;
  const displayCount = count + (reaction ? 1 : 0);
  const isActive = Boolean(reaction);

  const picker = pickerOpen ? (
    <div
      ref={pickerRef}
      className={`post-reaction__picker${usePortalPicker ? " post-reaction__picker--portal" : ""}`}
      role="menu"
      aria-label="Choose a reaction"
      style={usePortalPicker && pickerPos ? { left: pickerPos.left, top: pickerPos.top } : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {FEED_REACTIONS.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          className={`post-reaction__option${reaction === item.id ? " is-selected" : ""}`}
          aria-label={item.label}
          title={item.label}
          onClick={() => selectReaction(item.id)}
        >
          <span aria-hidden="true">{item.emoji}</span>
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div
      ref={rootRef}
      className={`post-reaction post-reaction--${variant}${pickerOpen ? " is-picker-open" : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {!usePortalPicker ? picker : null}
      {usePortalPicker && mounted && picker ? createPortal(picker, document.body) : null}

      <button
        ref={buttonRef}
        type="button"
        className={
          isComment
            ? `feed-video-viewer__comment-like${isActive ? " is-liked" : ""}${reaction ? ` is-${reaction}` : ""}`
            : isViewer
              ? `feed-video-viewer__action feed-video-viewer__action--like${isActive ? " is-liked" : ""}${reaction ? ` is-${reaction}` : ""}`
              : `post-action post-action--like${isActive ? " is-liked" : ""}${reaction ? ` is-${reaction}` : ""}`
        }
        aria-label={reaction ? `Remove ${activeReaction?.label ?? "reaction"} reaction` : "Like"}
        aria-pressed={isActive}
        aria-haspopup="menu"
        aria-expanded={pickerOpen}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onContextMenu={(event) => event.preventDefault()}
        onClick={handleClick}
      >
        {activeReaction ? (
          <span className="post-reaction__emoji" aria-hidden="true">
            {activeReaction.emoji}
          </span>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        )}
        <span className={isComment ? undefined : isViewer ? undefined : "post-action__count"}>
          {isComment ? displayCount : formatCount(displayCount)}
        </span>
      </button>
    </div>
  );
}

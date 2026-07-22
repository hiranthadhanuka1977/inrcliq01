"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

type FollowButtonProps = {
  following: boolean;
  onFollowingChange: (next: boolean) => void;
  className?: string;
  name?: string;
  followLabel?: string;
  followingLabel?: string;
  followContent?: ReactNode;
  followingContent?: ReactNode;
  stopPropagation?: boolean;
};

type PopoverCoords = {
  top: number;
  left: number;
  transformOrigin: string;
};

const POPOVER_GAP = 8;
const POPOVER_MIN_WIDTH = 168;
const VIEWPORT_PAD = 8;

function placePopover(anchor: DOMRect, popover: DOMRect | null): PopoverCoords {
  const width = popover?.width || POPOVER_MIN_WIDTH;
  const height = popover?.height || 96;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const spaceBelow = vh - anchor.bottom - VIEWPORT_PAD;
  const spaceAbove = anchor.top - VIEWPORT_PAD;
  const placeAbove = spaceBelow < height + POPOVER_GAP && spaceAbove > spaceBelow;

  let top = placeAbove ? anchor.top - POPOVER_GAP - height : anchor.bottom + POPOVER_GAP;
  top = Math.min(Math.max(top, VIEWPORT_PAD), Math.max(VIEWPORT_PAD, vh - height - VIEWPORT_PAD));

  let left = anchor.right - width;
  left = Math.min(Math.max(left, VIEWPORT_PAD), Math.max(VIEWPORT_PAD, vw - width - VIEWPORT_PAD));

  return {
    top,
    left,
    transformOrigin: placeAbove ? "bottom right" : "top right",
  };
}

export default function FollowButton({
  following,
  onFollowingChange,
  className = "",
  name,
  followLabel = "Follow",
  followingLabel = "Following",
  followContent,
  followingContent,
  stopPropagation = false,
}: FollowButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords | null>(null);
  const [mounted, setMounted] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const hasCustomContent = followContent !== undefined || followingContent !== undefined;
  const content = following
    ? followingContent !== undefined
      ? followingContent
      : followingLabel
    : followContent !== undefined
      ? followContent
      : followLabel;

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!confirmOpen) {
      setCoords(null);
      return;
    }

    function updatePosition() {
      const anchor = buttonRef.current?.getBoundingClientRect();
      if (!anchor) return;
      const popover = popoverRef.current?.getBoundingClientRect() ?? null;
      setCoords(placePopover(anchor, popover));
    }

    updatePosition();
    // Re-measure after paint so we use the real popover size.
    const frame = window.requestAnimationFrame(updatePosition);

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [confirmOpen]);

  useEffect(() => {
    if (!confirmOpen) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (wrapRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setConfirmOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setConfirmOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [confirmOpen]);

  useEffect(() => {
    if (!following) setConfirmOpen(false);
  }, [following]);

  const popoverStyle: CSSProperties = {
    top: coords?.top ?? 0,
    left: coords?.left ?? 0,
    transformOrigin: coords?.transformOrigin ?? "top right",
    visibility: coords ? "visible" : "hidden",
  };

  function toggleConfirm() {
    if (confirmOpen) {
      setConfirmOpen(false);
      return;
    }
    const anchor = buttonRef.current?.getBoundingClientRect();
    if (anchor) setCoords(placePopover(anchor, null));
    setConfirmOpen(true);
  }

  return (
    <div className={`follow-btn${confirmOpen ? " is-open" : ""}${following ? " is-following" : ""}`} ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`${className}${following ? " is-following" : ""}`.trim()}
        aria-pressed={following}
        aria-expanded={following ? confirmOpen : undefined}
        aria-haspopup={following ? "dialog" : undefined}
        aria-label={
          hasCustomContent
            ? following
              ? name
                ? `Unfollow ${name}`
                : "Unfollow"
              : name
                ? `Follow ${name}`
                : "Follow"
            : undefined
        }
        onClick={(event) => {
          if (stopPropagation) {
            event.preventDefault();
            event.stopPropagation();
          }
          if (!following) {
            onFollowingChange(true);
            return;
          }
          toggleConfirm();
        }}
      >
        {content}
      </button>

      {mounted && confirmOpen
        ? createPortal(
            <div
              ref={popoverRef}
              className="follow-btn__popover"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              style={popoverStyle}
            >
              <p id={titleId} className="follow-btn__popover-copy">
                {name ? `Unfollow ${name}?` : "Unfollow?"}
              </p>
              <div className="follow-btn__popover-actions">
                <button
                  type="button"
                  className="follow-btn__popover-btn"
                  onClick={(event) => {
                    if (stopPropagation) {
                      event.preventDefault();
                      event.stopPropagation();
                    }
                    setConfirmOpen(false);
                  }}
                >
                  No
                </button>
                <button
                  type="button"
                  className="follow-btn__popover-btn follow-btn__popover-btn--yes"
                  onClick={(event) => {
                    if (stopPropagation) {
                      event.preventDefault();
                      event.stopPropagation();
                    }
                    onFollowingChange(false);
                    setConfirmOpen(false);
                  }}
                >
                  Yes
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

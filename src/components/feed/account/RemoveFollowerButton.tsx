"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

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

export default function RemoveFollowerButton({
  userId,
  name,
  onRemoved,
}: {
  userId: string;
  name: string;
  onRemoved: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords | null>(null);
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

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

  const popoverStyle: CSSProperties = {
    top: coords?.top ?? 0,
    left: coords?.left ?? 0,
    transformOrigin: coords?.transformOrigin ?? "top right",
    visibility: coords ? "visible" : "hidden",
  };

  function toggleConfirm() {
    if (busy) return;
    if (confirmOpen) {
      setConfirmOpen(false);
      return;
    }
    const anchor = buttonRef.current?.getBoundingClientRect();
    if (anchor) setCoords(placePopover(anchor, null));
    setConfirmOpen(true);
  }

  async function confirmRemove() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/feed/me/followers/${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        window.alert(data.error || "Could not remove follower.");
        return;
      }
      setConfirmOpen(false);
      onRemoved();
    } catch {
      window.alert("Could not remove follower.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`follow-btn${confirmOpen ? " is-open" : ""}`} ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="btn btn--sm btn--secondary"
        aria-expanded={confirmOpen}
        aria-haspopup="dialog"
        aria-label={name ? `Remove ${name}` : "Remove"}
        disabled={busy}
        onClick={toggleConfirm}
      >
        Remove
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
                {name ? `Remove ${name}?` : "Remove this follower?"}
              </p>
              <div className="follow-btn__popover-actions">
                <button
                  type="button"
                  className="follow-btn__popover-btn"
                  disabled={busy}
                  onClick={() => setConfirmOpen(false)}
                >
                  No
                </button>
                <button
                  type="button"
                  className="follow-btn__popover-btn follow-btn__popover-btn--yes"
                  disabled={busy}
                  onClick={() => {
                    void confirmRemove();
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

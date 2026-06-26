"use client";

import { useEffect, useRef, useState } from "react";
import { resetPrototype } from "@/lib/prototype/reset-prototype";

const ControlsIcon = () => (
  <svg
    className="prototype-controls__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

export function PrototypeControls() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleResetPrototype() {
    const confirmed = window.confirm(
      "Reset the prototype? This clears all users and data, removes your session cookie, clears saved signup state in this browser, and returns you to the landing page.",
    );
    if (!confirmed) return;

    setResetting(true);
    setOpen(false);

    const result = await resetPrototype();
    if (!result.ok) {
      window.alert(result.error);
      setResetting(false);
    }
  }

  return (
    <div className="prototype-controls" ref={rootRef}>
      <button
        type="button"
        className="prototype-controls__trigger"
        id="btn-prototype-controls"
        aria-label="Controls"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ControlsIcon />
      </button>

      {open ? (
        <div className="prototype-controls__menu" role="menu" aria-label="Prototype controls">
          <button
            type="button"
            className="prototype-controls__item"
            role="menuitem"
            disabled={resetting}
            onClick={() => void handleResetPrototype()}
          >
            {resetting ? "Resetting…" : "Reset Prototype"}
          </button>
          <a
            href="/settings"
            target="_blank"
            rel="noopener noreferrer"
            className="prototype-controls__item prototype-controls__link"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Settings
          </a>
        </div>
      ) : null}
    </div>
  );
}

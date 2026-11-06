"use client";

import { useEffect, useId, useRef, useState } from "react";

export default function CollectionMenu({
  editHref,
  addHref,
  addLabel,
}: {
  editHref: string;
  addHref: string | null;
  addLabel: string | null;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="studio-menu" ref={rootRef}>
      <button
        type="button"
        className="studio-menu__trigger"
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="3" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="8" cy="13" r="1.4" />
        </svg>
      </button>
      {open ? (
        <div className="studio-menu__panel" id={menuId} role="menu">
          <a role="menuitem" href={editHref} onClick={() => setOpen(false)}>
            Edit
          </a>
          {addHref && addLabel ? (
            <a role="menuitem" href={addHref} onClick={() => setOpen(false)}>
              {addLabel}
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";

export function Disclosure({
  label,
  children,
  id,
  triggerId,
  panelId,
  className = "verify-email__info",
}: {
  label: string;
  children: React.ReactNode;
  id?: string;
  triggerId?: string;
  panelId?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const resolvedTriggerId = triggerId ?? (id ? `${id}-trigger` : undefined);
  const resolvedPanelId = panelId ?? (id ? `${id}-panel` : undefined);

  return (
    <div className={`disclosure ${className}${open ? " is-open" : ""}`} id={id}>
      <button
        type="button"
        className="disclosure__trigger"
        id={resolvedTriggerId}
        aria-expanded={open}
        aria-controls={resolvedPanelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="disclosure__trigger-main">
          <svg className="disclosure__info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span className="disclosure__label">{label}</span>
        </span>
        <svg className="disclosure__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div className="disclosure__panel" id={resolvedPanelId}>
        <div className="disclosure__panel-inner">
          <div className="disclosure__content verify-email__info-content">{children}</div>
        </div>
      </div>
    </div>
  );
}

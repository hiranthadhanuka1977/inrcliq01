"use client";

export type DmSafetyStatus = "healthy" | "attention";

export function dmContactSafetyStatus(contactId: string): DmSafetyStatus {
  let hash = 0;
  for (let i = 0; i < contactId.length; i += 1) {
    hash = (hash + contactId.charCodeAt(i) * (i + 1)) % 997;
  }
  return hash % 3 === 0 ? "attention" : "healthy";
}

function DmContactStatusIcon({ status }: { status: DmSafetyStatus }) {
  if (status === "attention") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function DmContactStatus({ status }: { status: DmSafetyStatus }) {
  const label = status === "attention" ? "Attention needed" : "All clear";

  return (
    <div
      className={`child-detail__dm-status child-detail__dm-status--${status}`}
      role="status"
      aria-label={label}
    >
      <span className="child-detail__dm-status-icon">
        <DmContactStatusIcon status={status} />
      </span>
      <span className="child-detail__dm-status-label">{label}</span>
    </div>
  );
}

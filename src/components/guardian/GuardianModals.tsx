export function DeclineModal({
  open,
  childFirstName,
  onCancel,
  onConfirm,
  isSubmitting,
}: {
  open: boolean;
  childFirstName: string;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop is-open" role="dialog" aria-modal="true" aria-labelledby="decline-modal-title">
      <div className="modal decline-modal text-center">
        <div className="decline-modal__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h2 id="decline-modal-title">Are you sure you want to decline?</h2>
        <p className="subtitle mt-4">
          {childFirstName}&apos;s account request will be cancelled and their details deleted. They will be
          notified.
        </p>
        <button
          type="button"
          className="btn btn--danger mt-8"
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Declining…" : "Yes, decline the request"}
        </button>
        <button type="button" className="btn btn--outline-info mt-3" onClick={onCancel} disabled={isSubmitting}>
          Actually, I will continue
        </button>
      </div>
    </div>
  );
}

export function CaptureSuccessModal({
  open,
  title,
  subtitle,
  buttonLabel,
  onContinue,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  buttonLabel: string;
  onContinue: () => void;
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop is-open" role="dialog" aria-modal="true" aria-labelledby="capture-modal-title">
      <div className="modal id-captured-modal text-center">
        <div className="id-captured-modal__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 id="capture-modal-title">{title}</h2>
        {subtitle ? <p className="subtitle mt-4">{subtitle}</p> : null}
        <button type="button" className="btn btn--primary mt-8" onClick={onContinue}>
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

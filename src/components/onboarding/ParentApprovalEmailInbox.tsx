"use client";

import { useDialogA11y } from "@/lib/accessibility/useDialogA11y";

type ParentApprovalEmailInboxProps = {
  open: boolean;
  parentEmail: string;
  childFirstName: string;
  approveUrl: string;
  onClose: () => void;
};

export function ParentApprovalEmailInbox({
  open,
  parentEmail,
  childFirstName,
  approveUrl,
  onClose,
}: ParentApprovalEmailInboxProps) {
  const { dialogRef } = useDialogA11y(open, onClose);

  if (!open) return null;

  const subject = `${childFirstName} wants to join InrCliq`;

  function handleOpenApproval(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    onClose();
    window.open(approveUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className="modal-backdrop is-open verify-email-inbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="parent-approval-inbox-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal verify-email-inbox" ref={dialogRef} tabIndex={-1}>
        <button
          type="button"
          className="modal__close verify-email-inbox__close"
          aria-label="Close email"
          onClick={onClose}
        >
          ×
        </button>

        <p className="verify-email-inbox__label">Inbox preview</p>
        <h2 id="parent-approval-inbox-title" className="verify-email-inbox__subject">
          {subject}
        </h2>

        <div className="verify-email-inbox__meta">
          <p className="verify-email__info-line">
            <span>From :</span> InrCliq
          </p>
          <p className="verify-email__info-line">
            <span>To :</span> {parentEmail}
          </p>
          <p className="verify-email__info-line">
            <span>Subject :</span> {subject}
          </p>
        </div>

        <div className="verify-email-inbox__body">
          <p>
            <strong>{childFirstName}</strong> has requested your approval to join InrCliq. Review the request and
            approve or decline it from the link below.
          </p>
          <p className="verify-email-inbox__action">
            <a
              href={approveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--primary verify-email-inbox__verify-btn"
              onClick={handleOpenApproval}
            >
              Review request
            </a>
          </p>
          <p className="verify-email-inbox__link-label">Or copy this link:</p>
          <a
            href={approveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="verify-email-inbox__link"
            onClick={handleOpenApproval}
          >
            {approveUrl}
          </a>
        </div>
      </div>
    </div>
  );
}

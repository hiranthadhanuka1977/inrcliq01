"use client";

import Link from "next/link";
import { useDialogA11y } from "@/lib/accessibility/useDialogA11y";

type UnavailableCopyProps = {
  creatorName: string;
};

function UnavailableCopy({ creatorName }: UnavailableCopyProps) {
  return (
    <>
      <h2 id="collection-unavailable-title">Collection unavailable</h2>
      <p className="subtitle mt-4">
        We&apos;re sorry for the inconvenience. {creatorName} has temporarily turned off their
        Collection storefront. Please try again later, or message them directly.
      </p>
    </>
  );
}

export function CollectionUnavailableModal({
  open,
  onClose,
  creatorName,
  profileSlug,
}: {
  open: boolean;
  onClose: () => void;
  creatorName: string;
  profileSlug: string;
}) {
  const { dialogRef } = useDialogA11y(open, onClose);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop is-open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="collection-unavailable-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal text-center special-requests-unavailable-modal" ref={dialogRef} tabIndex={-1}>
        <UnavailableCopy creatorName={creatorName} />
        <div className="special-requests-unavailable__actions">
          <Link
            href={`/feed/messages?slug=${encodeURIComponent(profileSlug)}`}
            className="btn btn--primary"
          >
            Message this creator
          </Link>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export function CollectionUnavailablePage({
  creatorName,
  profileSlug,
}: {
  creatorName: string;
  profileSlug: string;
}) {
  return (
    <div className="special-requests-unavailable">
      <div className="special-requests-unavailable__card">
        <UnavailableCopy creatorName={creatorName} />
        <div className="special-requests-unavailable__actions">
          <Link
            href={`/feed/messages?slug=${encodeURIComponent(profileSlug)}`}
            className="btn btn--primary"
          >
            Message this creator
          </Link>
          <Link href={`/feed/profile/${profileSlug}`} className="btn btn--secondary">
            Back to profile
          </Link>
        </div>
      </div>
    </div>
  );
}

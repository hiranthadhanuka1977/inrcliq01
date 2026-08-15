"use client";

import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import FirstPostPrompt from "@/components/feed/account/FirstPostPrompt";
import { useDialogA11y } from "@/lib/accessibility/useDialogA11y";

export default function CreatePostModal({
  open,
  onClose,
  firstName,
}: {
  open: boolean;
  onClose: () => void;
  firstName: string | null;
}) {
  const handleClose = useCallback(() => {
    if (document.querySelector(".image-editor")) return;
    onClose();
  }, [onClose]);

  const { dialogRef } = useDialogA11y(open, handleClose);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop is-open create-post-modal">
      <button
        type="button"
        className="create-post-modal__scrim"
        aria-label="Close create post"
        onClick={handleClose}
      />
      <div
        ref={dialogRef}
        className="modal create-post-modal__dialog"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        <FirstPostPrompt variant="modal" firstName={firstName} onClose={handleClose} />
      </div>
    </div>,
    document.body,
  );
}

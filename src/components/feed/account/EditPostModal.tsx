"use client";

import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import FirstPostPrompt from "@/components/feed/account/FirstPostPrompt";
import { useDialogA11y } from "@/lib/accessibility/useDialogA11y";
import type { FeedItem } from "@/types/feed/feed";

export default function EditPostModal({
  item,
  onClose,
  firstName,
  verified = false,
}: {
  item: FeedItem;
  onClose: () => void;
  firstName: string | null;
  verified?: boolean;
}) {
  const handleClose = useCallback(() => {
    if (document.querySelector(".image-editor")) return;
    if (
      document.querySelector("[data-video-uploading]") &&
      !window.confirm("Upload in progress. Are you sure you want to leave?")
    ) {
      return;
    }
    onClose();
  }, [onClose]);

  const { dialogRef } = useDialogA11y(true, handleClose);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div className="modal-backdrop is-open create-post-modal">
      <button type="button" className="create-post-modal__scrim" aria-label="Close edit post" onClick={handleClose} />
      <div
        ref={dialogRef}
        className="modal create-post-modal__dialog"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        <FirstPostPrompt
          key={item.id}
          variant="modal"
          firstName={firstName}
          verified={verified}
          editItem={item}
          onClose={handleClose}
        />
      </div>
    </div>,
    document.body,
  );
}

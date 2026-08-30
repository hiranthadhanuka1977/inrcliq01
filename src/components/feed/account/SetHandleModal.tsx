"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { suggestHandle } from "@/lib/auth/credentials";
import { useDialogA11y } from "@/lib/accessibility/useDialogA11y";
import {
  isHandleRequirementMet,
  validateHandle,
} from "@/lib/form-validation";

export default function SetHandleModal({
  open,
  onClose,
  firstName,
  lastName,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  firstName: string | null;
  lastName: string | null;
  onSaved: (handle: string) => void;
}) {
  const titleId = useId();
  const handleRef = useRef<HTMLInputElement>(null);
  const [handle, setHandle] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    onClose();
  }, [isSubmitting, onClose]);

  const { dialogRef } = useDialogA11y(open, handleClose);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setInitialized(false);
      setFieldError("");
      setApiError("");
      return;
    }
    if (!initialized) {
      setHandle(suggestHandle(firstName ?? "", lastName ?? ""));
      setInitialized(true);
    }
    handleRef.current?.focus();
  }, [firstName, initialized, lastName, open]);

  const requirementMet = isHandleRequirementMet(handle);

  async function submit() {
    setApiError("");
    setFieldError("");
    const validationError = validateHandle(handle);
    if (validationError) {
      setFieldError(validationError);
      handleRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/feed/me/handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        handle?: string;
      };

      if (!response.ok || !data.handle) {
        setApiError(data.error ?? "Unable to save handle.");
        return;
      }

      onSaved(data.handle);
      onClose();
    } catch {
      setApiError("Unable to save handle.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop is-open set-handle-modal">
      <button
        type="button"
        className="set-handle-modal__scrim"
        aria-label="Close"
        onClick={handleClose}
      />
      <div
        ref={dialogRef}
        className="modal set-handle-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <button
          type="button"
          className="modal__close set-handle-modal__close"
          aria-label="Close"
          onClick={handleClose}
        >
          ×
        </button>
        <h2 id={titleId} className="set-handle-modal__title">
          Choose your handle
        </h2>
        <p className="set-handle-modal__subtitle">
          Your unique @name on InrCliq — how others find and mention you.
        </p>

        <div className="field">
          <label className="field-label" htmlFor="profile-set-handle">
            Handle
          </label>
          <div className="handle-input">
            <span className="handle-input__prefix" aria-hidden="true">
              @
            </span>
            <input
              ref={handleRef}
              className="input handle-input__field"
              type="text"
              id="profile-set-handle"
              maxLength={24}
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              placeholder="yourname"
              autoComplete="username"
              spellCheck={false}
              aria-invalid={Boolean(fieldError)}
              disabled={isSubmitting}
            />
          </div>
          {fieldError ? (
            <p className="field-error mt-3" role="alert">
              {fieldError}
            </p>
          ) : null}
          <p className={`password-requirement mt-4${requirementMet ? " is-met" : ""}`}>
            <span className="password-requirement__mark" aria-hidden="true" />
            <span>No spaces · Max 24 characters · Letters, numbers, underscores, and periods only</span>
          </p>
        </div>

        {apiError ? (
          <p className="field-error mt-4" role="alert">
            {apiError}
          </p>
        ) : null}

        <div className="set-handle-modal__actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void submit()}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : "Save handle"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

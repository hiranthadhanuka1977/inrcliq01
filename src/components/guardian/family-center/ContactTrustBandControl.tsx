"use client";

import { useEffect, useId, useState, type MouseEvent } from "react";
import { useDialogA11y } from "@/lib/accessibility/useDialogA11y";
import {
  CONTACT_TRUST_BANDS,
  type ContactTrustBandId,
} from "@/lib/guardian/family-center-static";

function bandLabel(bandId: ContactTrustBandId) {
  return CONTACT_TRUST_BANDS.find((band) => band.id === bandId)?.label ?? bandId;
}

function CogIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.606.86 1.01 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default function ContactTrustBandControl({
  childUserId,
  childName,
  contactKey,
  contactKind = "dm",
  contactName,
  initialBand,
  compact = false,
}: {
  childUserId: string;
  childName: string;
  contactKey: string;
  contactKind?: "dm" | "sibling";
  contactName: string;
  initialBand: ContactTrustBandId;
  compact?: boolean;
}) {
  const titleId = useId();
  const [band, setBand] = useState(initialBand);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(initialBand);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBand(initialBand);
    setSelected(initialBand);
  }, [initialBand]);

  function closeModal() {
    if (isSaving) return;
    setOpen(false);
    setSelected(band);
    setError(null);
  }

  const { dialogRef } = useDialogA11y(open, closeModal);

  function openModal(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setSelected(band);
    setError(null);
    setOpen(true);
  }

  async function saveBand() {
    if (selected === band) {
      setOpen(false);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/guardian/contact-trust-band", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childUserId,
          contactKey,
          contactKind,
          trustBand: selected,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Could not update circle band.");
      }
      setBand(selected);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update circle band.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div
        className={`contact-trust-band${compact ? " contact-trust-band--compact" : ""}`}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <span className="contact-trust-band__label">{bandLabel(band)}</span>
        <button
          type="button"
          className="contact-trust-band__cog"
          aria-label={`Change circle band for ${contactName}`}
          onClick={openModal}
        >
          <CogIcon />
        </button>
      </div>

      {open ? (
        <div
          className="modal-backdrop is-open"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="modal contact-trust-band-modal" ref={dialogRef} tabIndex={-1}>
            <h2 id={titleId}>Change circle band</h2>
            <p className="subtitle mt-4">
              Choose which trust band <strong>{contactName}</strong> belongs to in{" "}
              {childName}&apos;s safe contact circle.
            </p>
            <ul className="contact-trust-band-modal__options" role="listbox" aria-label="Circle bands">
              {CONTACT_TRUST_BANDS.map((option) => {
                const isSelected = selected === option.id;
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`contact-trust-band-modal__option${isSelected ? " is-selected" : ""}`}
                      onClick={() => setSelected(option.id)}
                      disabled={isSaving}
                    >
                      <span className="contact-trust-band-modal__option-label">{option.label}</span>
                      <span className="contact-trust-band-modal__option-desc">{option.description}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {error ? (
              <p className="field-error mt-4" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              className="btn btn--primary mt-8"
              onClick={saveBand}
              disabled={isSaving}
            >
              {isSaving ? "Saving…" : "Save band"}
            </button>
            <button
              type="button"
              className="btn btn--outline-info mt-3"
              onClick={closeModal}
              disabled={isSaving}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

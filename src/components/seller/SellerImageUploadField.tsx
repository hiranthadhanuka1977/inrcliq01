"use client";

import { useId, useRef, useState } from "react";

type SellerImageUploadFieldProps = {
  label: string;
  hint?: string;
  value: string;
  required?: boolean;
  aspect?: "wide" | "square";
  disabled?: boolean;
  onChange: (url: string) => void;
  onError?: (message: string) => void;
};

export function SellerImageUploadField({
  label,
  hint,
  value,
  required = false,
  aspect = "wide",
  disabled = false,
  onChange,
  onError,
}: SellerImageUploadFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState("");

  const hasImage = Boolean(value.trim());

  async function handleFile(file: File | null) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      const message = "Choose an image file (JPG, PNG, WebP, or GIF).";
      setLocalError(message);
      onError?.(message);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      const message = "Image must be 5MB or smaller.";
      setLocalError(message);
      onError?.(message);
      return;
    }

    setUploading(true);
    setLocalError("");

    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/seller/uploads", {
        method: "POST",
        body,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data?.error ?? "Unable to upload image.";
        setLocalError(message);
        onError?.(message);
        return;
      }
      onChange(data.url as string);
    } catch {
      const message = "Unable to upload image.";
      setLocalError(message);
      onError?.(message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="seller-image-field">
      <div className="seller-image-field__label-row">
        <label className="field-label" htmlFor={inputId}>
          {label}
          {required ? <span className="seller-image-field__required">Required</span> : null}
        </label>
        {hint ? <p className="field-hint seller-image-field__hint">{hint}</p> : null}
      </div>

      <div
        className={`seller-image-field__frame seller-image-field__frame--${aspect}${hasImage ? " has-image" : ""}${localError ? " is-invalid" : ""}`}
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="seller-image-field__preview" />
        ) : (
          <div className="seller-image-field__placeholder">
            <span className="seller-image-field__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="8.5" cy="10" r="1.5" />
                <path d="m21 15-5-5L5 19" />
              </svg>
            </span>
            <strong>Upload image</strong>
            <span>JPG, PNG, or WebP · up to 5MB</span>
          </div>
        )}

        <input
          ref={inputRef}
          id={inputId}
          className="seller-image-field__input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={disabled || uploading}
          onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
        />
      </div>

      <div className="seller-image-field__actions">
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading…" : hasImage ? "Replace image" : "Choose image"}
        </button>
        {hasImage ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={disabled || uploading}
            onClick={() => {
              onChange("");
              setLocalError("");
            }}
          >
            Remove
          </button>
        ) : null}
      </div>

      {localError ? (
        <p className="field-error" role="alert">
          {localError}
        </p>
      ) : null}
      {required && !hasImage && !localError ? (
        <p className="field-hint">An image is required before this can go live.</p>
      ) : null}
    </div>
  );
}

export function servicePosterUrl(service: { media: { kind: string; poster?: string } }): string {
  if (service.media.kind === "video" && typeof service.media.poster === "string") {
    return service.media.poster;
  }
  return "";
}

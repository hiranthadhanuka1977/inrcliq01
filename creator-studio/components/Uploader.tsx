"use client";

import { useState, type ChangeEvent } from "react";
import { mediaSrc } from "../lib/media";

export default function Uploader({
  name,
  kind,
  label,
  accept,
  initial,
}: {
  name: string;
  kind: "video" | "audio" | "image";
  label: string;
  accept: string;
  initial: string | null;
}) {
  const [url, setUrl] = useState(initial ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    const body = new FormData();
    body.set("kind", kind);
    body.set("file", file);
    const response = await fetch("/api/upload", { method: "POST", body });
    const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
    setBusy(false);
    if (!response.ok || !payload?.url) {
      setError(payload?.error || "Upload failed.");
      return;
    }
    setUrl(payload.url);
  }

  const src = url ? mediaSrc(url) : "";
  const hint = kind === "image" ? "JPG, PNG, or WebP" : kind === "audio" ? "MP3, M4A, WAV, or AAC" : "MP4, MOV, or WebM";

  return (
    <div className="studio-drop">
      <span className="studio-drop__label">{label}</span>
      <label className="studio-drop__zone">
        <input aria-label={label} type="file" accept={accept} onChange={(event) => void onChange(event)} />
        <strong>{busy ? "Uploading…" : src ? "Replace file" : "Choose a file"}</strong>
        <span>{hint}</span>
      </label>
      <input type="hidden" name={name} value={url} />
      {error ? <small className="studio-error">{error}</small> : null}
      {src && kind === "image" ? <img className="studio-preview" src={src} alt="" /> : null}
      {src && kind === "video" ? <video className="studio-preview" src={src} controls /> : null}
      {src && kind === "audio" ? <audio className="studio-preview-audio" src={src} controls /> : null}
    </div>
  );
}

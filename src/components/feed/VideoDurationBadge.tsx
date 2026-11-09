"use client";

import { useState } from "react";

function formatProbeDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const safe = Math.round(seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remain = safe % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}`;
  return `${minutes}:${String(remain).padStart(2, "0")}`;
}

/** Shows a saved length, or reads it from the file when the post did not store one. */
export default function VideoDurationBadge({
  label,
  src,
  startSeconds = 0,
  endSeconds = null,
}: {
  label: string | null;
  src: string | null;
  startSeconds?: number;
  endSeconds?: number | null;
}) {
  const [resolved, setResolved] = useState(label);
  if (resolved) return <span className="yt-card__duration">{resolved}</span>;
  if (!src) return null;

  return (
    <video
      className="yt-card__probe"
      src={`${src}#t=${Math.max(0.1, startSeconds)}`}
      muted
      playsInline
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
      onLoadedMetadata={(event) => {
        const fileLength = event.currentTarget.duration;
        if (!Number.isFinite(fileLength) || fileLength <= 0) return;
        const end = endSeconds != null ? Math.min(endSeconds, fileLength) : fileLength;
        const next = formatProbeDuration(end - startSeconds);
        if (next) setResolved(next);
      }}
    />
  );
}

"use client";

import { useEffect, useRef } from "react";

export default function StudioPlayer({
  kind,
  src,
  poster,
  startMs,
  endMs,
}: {
  kind: "VIDEO" | "AUDIO";
  src: string;
  poster?: string | null;
  startMs: number;
  endMs: number | null;
}) {
  const ref = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const start = Math.max(0, startMs) / 1000;
    const end = endMs != null && endMs > startMs ? endMs / 1000 : null;

    const onReady = () => {
      if (start > 0 && element.currentTime < start) element.currentTime = start;
    };
    const onPlay = () => {
      if (element.currentTime < start - 0.05 || (end != null && element.currentTime >= end - 0.1)) {
        element.currentTime = start;
      }
    };
    const onTime = () => {
      if (end != null && element.currentTime >= end - 0.05) {
        element.pause();
        element.currentTime = start;
      }
    };

    element.addEventListener("loadedmetadata", onReady);
    element.addEventListener("play", onPlay);
    element.addEventListener("timeupdate", onTime);
    return () => {
      element.removeEventListener("loadedmetadata", onReady);
      element.removeEventListener("play", onPlay);
      element.removeEventListener("timeupdate", onTime);
    };
  }, [src, startMs, endMs]);

  if (kind === "VIDEO") {
    return (
      <video
        ref={(node) => {
          ref.current = node;
        }}
        className="video-watch__player"
        src={src}
        poster={poster ?? undefined}
        controls
        playsInline
      />
    );
  }

  return (
    <audio
      ref={(node) => {
        ref.current = node;
      }}
      className="video-watch__audio"
      src={src}
      controls
    />
  );
}

"use client";

import { useId } from "react";

interface MediaPlayOverlayProps {
  className?: string;
}

export default function MediaPlayOverlay({ className = "post-media__play" }: MediaPlayOverlayProps) {
  const maskId = useId();

  return (
    <div className={className} aria-hidden="true">
      <span>
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <defs>
            <mask id={maskId}>
              <rect width="48" height="48" fill="white" />
              <path d="M19 15.5v17l14-8.5-14-8.5z" fill="black" />
            </mask>
          </defs>
          <circle cx="24" cy="24" r="23" fill="#fff" stroke="#fff" strokeWidth="2" mask={`url(#${maskId})`} />
        </svg>
      </span>
    </div>
  );
}

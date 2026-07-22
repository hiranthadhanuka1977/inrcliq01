"use client";

import { useEffect } from "react";
import { useAudioLanding } from "@/context/feed/AudioLandingContext";
import { SkipBack15Icon, SkipForward15Icon } from "@/components/feed/audio/AudioSkip15Icons";
import type { AudioContentType } from "@/types/feed/audio-landing";

function PlayPauseIcon({ playing }: { playing: boolean }) {
  if (playing) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect x="7" y="6" width="3.5" height="12" rx="0.75" />
        <rect x="13.5" y="6" width="3.5" height="12" rx="0.75" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5-11-6.5z" />
    </svg>
  );
}

function typeLabel(type: AudioContentType): string {
  if (type === "podcast") return "Podcast";
  if (type === "audiobook") return "Audiobook";
  return "Music";
}

export default function AudioFullscreenPlayer() {
  const {
    activeTrack,
    playing,
    progress,
    currentTimeLabel,
    durationLabel,
    togglePlay,
    skipBy,
    toggleLike,
    liked,
    showDockPlayer,
    showFullscreenPlayer,
    closeFullscreenPlayer,
    seekTo,
  } = useAudioLanding();

  const isLongForm = activeTrack.type === "podcast" || activeTrack.type === "audiobook";

  useEffect(() => {
    if (!showFullscreenPlayer) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeFullscreenPlayer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeFullscreenPlayer, showFullscreenPlayer]);

  if (!showDockPlayer || !showFullscreenPlayer) {
    return null;
  }

  const handleScrub = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    seekTo(ratio * activeTrack.durationSeconds);
  };

  return (
    <div
      className="audio-fullscreen"
      role="dialog"
      aria-modal="true"
      aria-label="Now playing"
      style={
        {
          "--fullscreen-a": activeTrack.accent[0],
          "--fullscreen-b": activeTrack.accent[1],
        } as React.CSSProperties
      }
    >
      <div className="audio-fullscreen__backdrop" aria-hidden="true" />

      <div className="audio-fullscreen__panel">
        <header className="audio-fullscreen__header">
          <button
            type="button"
            className="audio-fullscreen__close"
            aria-label="Close player"
            onClick={closeFullscreenPlayer}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <div className="audio-fullscreen__art">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={activeTrack.thumbnail} alt="" />
        </div>

        <div className="audio-fullscreen__meta">
          <span className="audio-fullscreen__type">{typeLabel(activeTrack.type)}</span>
          <h2 className="audio-fullscreen__title">{activeTrack.title}</h2>
          <p className="audio-fullscreen__creator">{activeTrack.creator}</p>
          {activeTrack.progressLabel ? (
            <p className="audio-fullscreen__progress-label">{activeTrack.progressLabel}</p>
          ) : null}
        </div>

        <div className="audio-fullscreen__timeline">
          <div
            className="audio-fullscreen__scrubber"
            role="slider"
            aria-label="Playback position"
            aria-valuemin={0}
            aria-valuemax={activeTrack.durationSeconds}
            aria-valuenow={Math.round(progress * activeTrack.durationSeconds)}
            onClick={handleScrub}
          >
            <span className="audio-fullscreen__scrubber-fill" style={{ width: `${progress * 100}%` }} />
            <span className="audio-fullscreen__scrubber-thumb" style={{ left: `${progress * 100}%` }} />
          </div>
          <div className="audio-fullscreen__times">
            <span>{currentTimeLabel}</span>
            <span>{durationLabel}</span>
          </div>
        </div>

        <div className="audio-fullscreen__controls" data-mode={isLongForm ? "longform" : "music"}>
          <button type="button" className="audio-fullscreen__btn" aria-label="Skip back 15 seconds" onClick={() => skipBy(-15)}>
            <SkipBack15Icon />
          </button>
          <button
            type="button"
            className="audio-fullscreen__btn audio-fullscreen__btn--primary"
            aria-label={playing ? "Pause" : "Play"}
            onClick={togglePlay}
          >
            <PlayPauseIcon playing={playing} />
          </button>
          <button type="button" className="audio-fullscreen__btn" aria-label="Skip forward 15 seconds" onClick={() => skipBy(15)}>
            <SkipForward15Icon />
          </button>
          {!isLongForm ? (
            <button
              type="button"
              className={`audio-fullscreen__btn audio-fullscreen__btn--like${liked ? " is-liked" : ""}`}
              aria-label={liked ? "Unlike track" : "Like track"}
              aria-pressed={liked}
              onClick={toggleLike}
            >
              <svg viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

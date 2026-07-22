"use client";

import { useAudioLanding } from "@/context/feed/AudioLandingContext";
import { SkipBack15Icon, SkipForward15Icon } from "@/components/feed/audio/AudioSkip15Icons";

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

export default function AudioDockPlayer() {
  const {
    activeTrack,
    playing,
    progress,
    currentTimeLabel,
    togglePlay,
    skipBy,
    toggleLike,
    liked,
    showDockPlayer,
    openFullscreenPlayer,
    closeDockPlayer,
  } = useAudioLanding();

  if (!showDockPlayer) {
    return null;
  }

  const isLongForm = activeTrack.type === "podcast" || activeTrack.type === "audiobook";

  return (
    <div
      className="audio-dock"
      role="region"
      aria-label="Now playing"
      style={
        {
          "--dock-a": activeTrack.accent[0],
          "--dock-b": activeTrack.accent[1],
        } as React.CSSProperties
      }
    >
      <div className="audio-dock__inner">
        <button
          type="button"
          className="audio-dock__track-hit"
          aria-label="Open now playing"
          onClick={openFullscreenPlayer}
        >
          <div className="audio-dock__track">
            <div className="audio-dock__art">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activeTrack.thumbnail} alt="" />
            </div>
            <div className="audio-dock__meta">
              <strong className="audio-dock__title">{activeTrack.title}</strong>
              <span className="audio-dock__creator">{activeTrack.creator}</span>
              <div
                className="audio-dock__progress"
                role="progressbar"
                aria-label="Playback position"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
              >
                <span
                  className={`audio-dock__progress-fill${playing ? " is-playing" : ""}`}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <span className="audio-dock__time">{currentTimeLabel}</span>
            </div>
          </div>
        </button>

        <div className="audio-dock__controls" data-mode={isLongForm ? "longform" : "music"}>
          <button
            type="button"
            className="audio-dock__btn"
            aria-label="Skip back 15 seconds"
            onClick={() => skipBy(-15)}
          >
            <SkipBack15Icon />
          </button>
          <button
            type="button"
            className="audio-dock__btn audio-dock__btn--primary"
            aria-label={playing ? "Pause" : "Play"}
            onClick={togglePlay}
          >
            <PlayPauseIcon playing={playing} />
          </button>
          <button
            type="button"
            className="audio-dock__btn"
            aria-label="Skip forward 15 seconds"
            onClick={() => skipBy(15)}
          >
            <SkipForward15Icon />
          </button>
          {!isLongForm ? (
            <button
              type="button"
              className={`audio-dock__btn audio-dock__btn--like${liked ? " is-liked" : ""}`}
              aria-label={liked ? "Unlike track" : "Like track"}
              aria-pressed={liked}
              onClick={toggleLike}
            >
              <svg viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          ) : null}
          <button
            type="button"
            className="audio-dock__btn audio-dock__btn--close"
            aria-label="Close player"
            onClick={closeDockPlayer}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useAudioPlayback } from "@/context/feed/AudioPlaybackContext";
import { getAudioThemeStyle } from "@/lib/feed/audio-theme";
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

export default function AudioMiniPlayer() {
  const {
    audio,
    showName,
    contentType,
    playing,
    progress,
    currentTimeLabel,
    showMiniPlayer,
    liked,
    togglePlay,
    skipBy,
    toggleLike,
    openFullscreenPlayer,
    close,
  } = useAudioPlayback();

  if (!showMiniPlayer || !audio) {
    return null;
  }

  const isLongForm = contentType === "podcast" || contentType === "audiobook";

  return (
    <div
      className="audio-mini audio-mini--dock"
      role="region"
      aria-label="Now playing"
      style={getAudioThemeStyle(audio.theme)}
    >
      <div className="audio-mini__inner">
        <button
          type="button"
          className="audio-mini__track-hit"
          aria-label="Open now playing"
          onClick={openFullscreenPlayer}
        >
          <div className="audio-mini__track">
            <div className="audio-mini__art">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={audio.thumbnail.url} alt="" />
            </div>
            <div className="audio-mini__meta">
              <strong className="audio-mini__title">{audio.title}</strong>
              {showName ? <span className="audio-mini__creator">{showName}</span> : null}
              <div
                className="audio-mini__scrubber"
                role="progressbar"
                aria-label="Playback position"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
              >
                <span
                  className={`audio-mini__scrubber-fill${playing ? " is-playing" : ""}`}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <span className="audio-mini__time">{currentTimeLabel}</span>
            </div>
          </div>
        </button>

        <div className="audio-mini__controls">
          <button
            type="button"
            className="audio-mini__btn"
            aria-label="Skip back 15 seconds"
            onClick={() => skipBy(-15)}
          >
            <SkipBack15Icon />
          </button>
          <button
            type="button"
            className="audio-mini__btn audio-mini__btn--primary"
            aria-label={playing ? "Pause audio" : "Play audio"}
            onClick={togglePlay}
          >
            <PlayPauseIcon playing={playing} />
          </button>
          <button
            type="button"
            className="audio-mini__btn"
            aria-label="Skip forward 15 seconds"
            onClick={() => skipBy(15)}
          >
            <SkipForward15Icon />
          </button>
          {!isLongForm ? (
            <button
              type="button"
              className={`audio-mini__btn audio-mini__btn--like${liked ? " is-liked" : ""}`}
              aria-label={liked ? "Unlike track" : "Like track"}
              aria-pressed={liked}
              onClick={toggleLike}
            >
              <svg
                viewBox="0 0 24 24"
                fill={liked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          ) : null}
          <button type="button" className="audio-mini__btn audio-mini__btn--close" aria-label="Close player" onClick={close}>
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

"use client";

import { useEffect, useMemo, useRef } from "react";
import type { FeedAudio } from "@/types/feed/feed";
import { useAudioPlaybackItem, type AudioFeedContentType } from "@/context/feed/AudioPlaybackContext";
import { formatTimecode, getInitialSeconds, parseTimecode } from "@/lib/feed/audio-time";
import { getAudioThemeStyle } from "@/lib/feed/audio-theme";
import { SkipBack15Icon, SkipForward15Icon } from "@/components/feed/audio/AudioSkip15Icons";

export type { AudioFeedContentType };

function ContentBadgeIcon({ type }: { type: AudioFeedContentType }) {
  if (type === "music") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    );
  }

  if (type === "audiobook") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function contentLabel(type: AudioFeedContentType): string {
  if (type === "podcast") return "Podcast";
  if (type === "audiobook") return "Audiobook";
  if (type === "music") return "Music";
  return "Audio";
}

function durationKind(type: AudioFeedContentType): string {
  if (type === "podcast") return "episode";
  if (type === "audiobook") return "audiobook";
  if (type === "music") return "track";
  return "audio";
}

export function resolveAudioContentType(tags: string[]): AudioFeedContentType {
  const normalized = tags.map((tag) => tag.toLowerCase());

  if (normalized.some((tag) => tag.includes("podcast"))) return "podcast";
  if (normalized.some((tag) => tag.includes("audiobook"))) return "audiobook";
  if (normalized.some((tag) => tag.includes("music"))) return "music";
  return "audio";
}

interface AudioFeedPlayerProps {
  itemId: string;
  audio: FeedAudio;
  showName?: string;
  contentType?: AudioFeedContentType;
}

function PlayPauseButton({
  playing,
  onClick,
  className,
}: {
  playing: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      aria-label={playing ? "Pause audio" : "Play audio"}
      onClick={onClick}
    >
      {playing ? (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="7" y="6" width="3.5" height="12" rx="0.75" />
          <rect x="13.5" y="6" width="3.5" height="12" rx="0.75" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5.5v13l11-6.5-11-6.5z" />
        </svg>
      )}
    </button>
  );
}

export default function AudioFeedPlayer({
  itemId,
  audio,
  showName,
  contentType = "audio",
}: AudioFeedPlayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  const {
    isActive,
    playing: contextPlaying,
    progress: contextProgress,
    currentTimeLabel: contextTimeLabel,
    activeItemId,
    registerInlineElement,
    ensureActive,
    activateAndToggle,
    skipBy,
  } = useAudioPlaybackItem(itemId, audio);

  const durationSeconds = useMemo(() => parseTimecode(audio.duration), [audio.duration]);
  const initialSeconds = useMemo(
    () => getInitialSeconds(audio, durationSeconds),
    [audio, durationSeconds],
  );

  const playing = isActive && contextPlaying;
  const progress = isActive
    ? contextProgress
    : durationSeconds > 0
      ? initialSeconds / durationSeconds
      : 0;
  const currentTimeLabel = isActive ? contextTimeLabel : formatTimecode(initialSeconds);

  useEffect(() => {
    const shouldObserve = activeItemId === null || activeItemId === itemId;
    if (!shouldObserve) {
      return;
    }

    registerInlineElement(itemId, rootRef.current);
    return () => registerInlineElement(itemId, null);
  }, [activeItemId, itemId, registerInlineElement]);

  const handleSkip = (deltaSeconds: number) => {
    if (!isActive) {
      ensureActive(itemId, audio, { showName, contentType });
    }
    skipBy(deltaSeconds);
  };

  const handlePlayToggle = () => activateAndToggle(itemId, audio, { showName, contentType });

  return (
    <div
      ref={rootRef}
      className="audio-feed audio-feed--podcast"
      aria-label={audio.title}
      style={getAudioThemeStyle(audio.theme)}
    >
      <div className="audio-feed__podcast-top">
        <span className="audio-feed__podcast-badge">
          <ContentBadgeIcon type={contentType} />
          {contentLabel(contentType)}
        </span>
        <span className="audio-feed__podcast-episode">
          {audio.duration} {durationKind(contentType)}
        </span>
      </div>

      <div className="audio-feed__podcast-main">
        <div className="audio-feed__art audio-feed__art--podcast">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={audio.thumbnail.url} alt={audio.thumbnail.alt} />
        </div>

        <div className="audio-feed__podcast-copy">
          <h4 className="audio-feed__podcast-title">{audio.title}</h4>
          {showName ? <p className="audio-feed__podcast-show">{showName}</p> : null}
        </div>

        <PlayPauseButton
          playing={playing}
          onClick={handlePlayToggle}
          className="audio-feed__play audio-feed__play--podcast"
        />
      </div>

      <div className="audio-feed__podcast-controls" role="group" aria-label="Audio playback controls">
        <button type="button" className="audio-feed__skip" aria-label="Skip back 15 seconds" onClick={() => handleSkip(-15)}>
          <SkipBack15Icon />
        </button>
        <span className="audio-feed__time">{currentTimeLabel}</span>
        <div
          className="audio-feed__scrubber audio-feed__scrubber--podcast"
          role="slider"
          aria-label="Playback position"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <span
            className={`audio-feed__scrubber-fill${playing ? " is-playing" : ""}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="audio-feed__time">{audio.duration}</span>
        <button type="button" className="audio-feed__skip" aria-label="Skip forward 15 seconds" onClick={() => handleSkip(15)}>
          <SkipForward15Icon />
        </button>
      </div>
    </div>
  );
}

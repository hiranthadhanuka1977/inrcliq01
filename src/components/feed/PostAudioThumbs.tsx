"use client";

import { useAudioPlaybackItem } from "@/context/feed/AudioPlaybackContext";
import type { FeedAudio } from "@/types/feed/feed";

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5-11-6.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="7" y="6" width="3.5" height="12" rx="0.75" />
      <rect x="13.5" y="6" width="3.5" height="12" rx="0.75" />
    </svg>
  );
}

function AudioThumb({
  itemId,
  audio,
  showName,
}: {
  itemId: string;
  audio: FeedAudio;
  showName?: string;
}) {
  const { isActive, playing, activateAndToggle } = useAudioPlaybackItem(itemId, audio);
  const isPlaying = isActive && playing;

  return (
    <button
      type="button"
      className={`post-audio-thumb${isPlaying ? " is-playing" : ""}`}
      aria-label={isPlaying ? `Pause ${audio.title}` : `Play ${audio.title}`}
      onClick={() => activateAndToggle(itemId, audio, { showName, contentType: "audio" })}
    >
      <span className="post-audio-thumb__art">
        {audio.thumbnail.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={audio.thumbnail.url} alt="" />
        ) : (
          <span className="post-audio-thumb__fallback" />
        )}
        <span className="post-audio-thumb__play">
          <span>{isPlaying ? <PauseIcon /> : <PlayIcon />}</span>
        </span>
      </span>
      <span className="post-audio-thumb__title">{audio.title}</span>
    </button>
  );
}

export default function PostAudioThumbs({
  postId,
  clips,
  showName,
}: {
  postId: string;
  clips: FeedAudio[];
  showName?: string;
}) {
  return (
    <div className="post-audio-thumbs" role="list">
      {clips.map((clip, index) => (
        <div key={`${postId}-audio-${index}`} role="listitem">
          <AudioThumb itemId={`${postId}:audio:${index}`} audio={clip} showName={showName} />
        </div>
      ))}
    </div>
  );
}

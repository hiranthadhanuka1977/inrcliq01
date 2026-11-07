export function PreviousTrackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 5.5h2.2v13H6z" />
      <path d="M19.5 6.2v11.6L9.2 12z" />
    </svg>
  );
}

export function NextTrackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M15.8 5.5H18v13h-2.2z" />
      <path d="M4.5 6.2v11.6L14.8 12z" />
    </svg>
  );
}

export function SkipBack15Icon() {
  return (
    <span className="audio-skip-glyph" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 5V2L7 7l5 5V9c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.96 7.96 0 0 0 20 15c0-4.42-3.58-8-8-8z" />
      </svg>
      <span>15</span>
    </span>
  );
}

export function SkipForward15Icon() {
  return (
    <span className="audio-skip-glyph audio-skip-glyph--fwd" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 5V2l5 5-5 5V9c-3.31 0-6 2.69-6 6 0 1.01.25 1.97.7 2.8L5.24 17.26A7.96 7.96 0 0 1 4 15c0-4.42 3.58-8 8-8z" />
      </svg>
      <span>15</span>
    </span>
  );
}

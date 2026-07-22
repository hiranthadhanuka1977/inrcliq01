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

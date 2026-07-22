interface FeedLoadingProps {
  compact?: boolean;
}

export default function FeedLoading({ compact = false }: FeedLoadingProps) {
  return (
    <div
      className={`feed-loading${compact ? " feed-loading--compact" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Loading feed"
    >
      <p className="feed-loading__sr-only">Loading feed…</p>
      <article className="feed-loading__card" aria-hidden="true">
        <div className="feed-loading__shimmer feed-loading__shimmer--head" />
        <div className="feed-loading__shimmer feed-loading__shimmer--line" />
        <div className="feed-loading__shimmer feed-loading__shimmer--line feed-loading__shimmer--short" />
        {!compact ? <div className="feed-loading__shimmer feed-loading__shimmer--media" /> : null}
        <div className="feed-loading__shimmer feed-loading__shimmer--footer" />
      </article>
    </div>
  );
}

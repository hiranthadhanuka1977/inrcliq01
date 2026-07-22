"use client";

import { useMemo, useState } from "react";
import { AUDIO_FOR_YOU_CARDS, AUDIO_FOR_YOU_PAGE_SIZE } from "@/data/feed/audio-landing";
import { formatCount } from "@/lib/feed/format";
import MediaPlayOverlay from "@/components/feed/MediaPlayOverlay";
import type { AudioContentType, AudioForYouCard } from "@/types/feed/audio-landing";

function typeLabel(type: AudioContentType): string {
  if (type === "podcast") return "Podcast";
  if (type === "audiobook") return "Audiobook";
  return "Music";
}

function AudioForYouCardItem({
  card,
  onPlay,
}: {
  card: AudioForYouCard;
  onPlay: () => void;
}) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <article className="audio-for-you-card">
      <button type="button" className="audio-for-you-card__hit" onClick={onPlay}>
        <div className="audio-for-you-card__art">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.thumbnail} alt="" />
          <MediaPlayOverlay className="audio-for-you-card__play" />
          <span className="audio-for-you-card__tag">{typeLabel(card.type)}</span>
        </div>
        <div className="audio-for-you-card__body">
          <h4 className="audio-for-you-card__title">{card.title}</h4>
          <p className="audio-for-you-card__creator">{card.creator}</p>
        </div>
      </button>
      <div className="audio-for-you-card__footer">
        <div className="audio-for-you-card__social">
          {card.likes ? (
            <button
              type="button"
              className={`audio-for-you-card__action audio-for-you-card__action--like${liked ? " is-liked" : ""}`}
              aria-label={liked ? "Unlike" : "Like"}
              aria-pressed={liked}
              onClick={() => setLiked((value) => !value)}
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
              <span>{formatCount(card.likes)} likes</span>
            </button>
          ) : null}
          {card.comments ? (
            <span className="audio-for-you-card__stat">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>{formatCount(card.comments)} comments</span>
            </span>
          ) : null}
          {card.sharedBy ? (
            <span className="audio-for-you-card__share">
              <span
                className="audio-for-you-card__share-av"
                style={{ "--story-color": card.sharedBy.color } as React.CSSProperties}
                aria-hidden="true"
              >
                {card.sharedBy.initials}
              </span>
              Shared by {card.sharedBy.name}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className={`audio-for-you-card__action audio-for-you-card__action--save${saved ? " is-saved" : ""}`}
          aria-label={saved ? "Remove bookmark" : "Bookmark"}
          aria-pressed={saved}
          onClick={() => setSaved((value) => !value)}
        >
          <svg
            viewBox="0 0 24 24"
            fill={saved ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>
    </article>
  );
}

const SUBTITLES: Record<AudioContentType | "all", string> = {
  all: "Music, podcasts & audiobooks blended",
  music: "Tracks and albums picked for you",
  podcast: "Episodes and shows picked for you",
  audiobook: "Titles picked for your next listen",
};

export default function AudioForYouSection({
  contentType = "all",
  cards,
  title = "For you",
  subtitle,
  onPlay,
}: {
  contentType?: AudioContentType | "all";
  cards?: AudioForYouCard[];
  title?: string;
  subtitle?: string;
  onPlay: (trackId: string) => void;
}) {
  const [page, setPage] = useState(0);

  const filteredCards = useMemo(() => {
    const source = cards ?? AUDIO_FOR_YOU_CARDS;
    if (contentType === "all") return source;
    return source.filter((card) => card.type === contentType);
  }, [cards, contentType]);

  const pageCount = Math.max(1, Math.ceil(filteredCards.length / AUDIO_FOR_YOU_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pagedCards = filteredCards.slice(
    safePage * AUDIO_FOR_YOU_PAGE_SIZE,
    safePage * AUDIO_FOR_YOU_PAGE_SIZE + AUDIO_FOR_YOU_PAGE_SIZE,
  );

  if (filteredCards.length === 0) return null;

  return (
    <section className="audio-for-you" aria-label={title}>
      <div className="rail-title">
        <h3>{title}</h3>
        <span className="audio-for-you__subtitle">{subtitle ?? SUBTITLES[contentType]}</span>
      </div>
      <div className="audio-for-you__grid">
        {pagedCards.map((card) => (
          <AudioForYouCardItem key={card.id} card={card} onPlay={() => onPlay(card.trackId)} />
        ))}
      </div>
      {pageCount > 1 ? (
        <nav className="audio-for-you__pager" aria-label={`${title} pagination`}>
          <button
            type="button"
            className="audio-for-you__pager-btn"
            disabled={safePage <= 0}
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            aria-label="Previous page"
          >
            Previous
          </button>
          <div className="audio-for-you__pager-pages" role="group" aria-label="Pages">
            {Array.from({ length: pageCount }, (_, index) => {
              const selected = index === safePage;
              return (
                <button
                  key={index}
                  type="button"
                  className={`audio-for-you__pager-page${selected ? " is-active" : ""}`}
                  aria-label={`Page ${index + 1}`}
                  aria-current={selected ? "page" : undefined}
                  onClick={() => setPage(index)}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="audio-for-you__pager-btn"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
            aria-label="Next page"
          >
            Next
          </button>
        </nav>
      ) : null}
    </section>
  );
}

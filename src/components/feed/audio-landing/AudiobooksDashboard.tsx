"use client";

import { useEffect, useState } from "react";
import {
  AUDIOBOOK_COLLECTIONS,
  AUDIOBOOK_CONTINUE_ITEMS,
  AUDIOBOOK_GENRES,
  AUDIOBOOK_HERO_SLIDES,
  AUDIOBOOK_LIVE_EVENTS,
  AUDIOBOOK_NARRATORS,
  AUDIOBOOK_TOP_CHART,
} from "@/data/feed/audio-landing";
import { formatCount } from "@/lib/feed/format";
import AudioCreatorCard from "@/components/feed/audio/AudioCreatorCard";
import AudioForYouSection from "@/components/feed/audio-landing/AudioForYouSection";
import AudioSpotlightHero from "@/components/feed/audio-landing/AudioSpotlightHero";
import type { AudioLiveEvent } from "@/types/feed/audio-landing";

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

function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function LiveEventCard({ event }: { event: AudioLiveEvent }) {
  const [remainingSeconds, setRemainingSeconds] = useState(event.startsInMinutes * 60);
  const [reminded, setReminded] = useState(false);

  useEffect(() => {
    const startsAt = Date.now() + event.startsInMinutes * 60_000;
    const tick = () => setRemainingSeconds(Math.max(0, Math.floor((startsAt - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [event.startsInMinutes]);

  const isLive = remainingSeconds <= 0;

  return (
    <article className="audio-live-drop-card">
      <div className="audio-live-drop-card__art">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={event.thumbnail} alt="" />
      </div>
      <div className="audio-live-drop-card__body">
        <span className="audio-live-drop-card__kind">{event.kind}</span>
        <strong className="audio-live-drop-card__title">{event.title}</strong>
        <span className="audio-live-drop-card__host">Hosted by {event.host}</span>
        <span className={`audio-live-drop-card__countdown${isLive ? " is-live" : ""}`}>
          {isLive ? "Live now" : `Starts in ${formatCountdown(remainingSeconds)}`}
        </span>
      </div>
      <button
        type="button"
        className={`audio-live-drop-card__remind${reminded ? " is-set" : ""}`}
        aria-pressed={reminded}
        onClick={() => setReminded((value) => !value)}
      >
        {reminded ? "Reminder set" : "Remind Me 🔔"}
      </button>
    </article>
  );
}

export default function AudiobooksDashboard({
  playing,
  activeTrackId,
  onPlay,
}: {
  playing: boolean;
  activeTrackId: string;
  onPlay: (trackId: string) => void;
}) {
  return (
    <div className="podcasts-dashboard">
      <AudioSpotlightHero onPlay={onPlay} slides={AUDIOBOOK_HERO_SLIDES} />

      <section className="audio-mood-section" aria-label="Audiobook genres">
        <div className="rail-title">
          <h3>Browse genres</h3>
        </div>
        <div className="audio-mood-grid">
          {AUDIOBOOK_GENRES.map((genre) => (
            <button
              key={genre.id}
              type="button"
              className="audio-mood-card"
              style={{ background: genre.gradient } as React.CSSProperties}
            >
              <span className="audio-mood-card__emoji" aria-hidden="true">
                {genre.emoji}
              </span>
              <span className="audio-mood-card__label">{genre.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rail rail--audio-row audio-continue-section" aria-label="Continue listening">
        <div className="rail-title">
          <h3>Continue listening</h3>
          <a className="rail-title__link" href="#">
            See all
          </a>
        </div>
        <div className="audio-continue-row">
          {AUDIOBOOK_CONTINUE_ITEMS.map((item) => (
            <article key={item.id} className="audio-continue-card">
              <button type="button" className="audio-continue-card__main" onClick={() => onPlay(item.id)}>
                <div className="audio-continue-card__art">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.thumbnail} alt="" />
                  <span className="audio-continue-card__type">Audiobook</span>
                </div>
                <div className="audio-continue-card__body">
                  <strong className="audio-continue-card__title">{item.title}</strong>
                  <span className="audio-continue-card__creator">{item.creator}</span>
                  <span className="audio-continue-card__meta">
                    {item.progressLabel ?? `${Math.round(item.progress * 100)}% completed`}
                  </span>
                  <div className="audio-continue-card__progress" aria-hidden="true">
                    <span style={{ width: `${item.progress * 100}%` }} />
                  </div>
                </div>
              </button>
              <button
                type="button"
                className="audio-continue-card__play"
                aria-label={`Resume ${item.title}`}
                onClick={() => onPlay(item.id)}
              >
                <PlayPauseIcon playing={playing && activeTrackId === item.id} />
              </button>
            </article>
          ))}
        </div>
      </section>

      <AudioForYouSection
        contentType="audiobook"
        title="New titles"
        subtitle="Fresh audiobooks worth starting"
        onPlay={onPlay}
      />

      <section className="podcast-shows" aria-label="Popular titles">
        <div className="rail-title">
          <h3>Popular titles</h3>
          <span className="audio-section__subtitle">Books your circle is finishing</span>
        </div>
        <div className="podcast-shows__row">
          {AUDIOBOOK_COLLECTIONS.map((book) => (
            <button
              key={book.id}
              type="button"
              className="podcast-show-card"
              onClick={() => onPlay(book.trackId)}
            >
              <span className="podcast-show-card__art">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={book.thumbnail} alt="" />
              </span>
              <strong className="podcast-show-card__title">{book.title}</strong>
              <span className="podcast-show-card__host">{book.subtitle}</span>
              <span className="podcast-show-card__meta">{book.meta}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="audio-top-creators" aria-label="Top authors and narrators">
        <div className="rail-title">
          <h3>Top authors</h3>
          <span className="audio-section__subtitle">Authors and narrators rising this week</span>
        </div>
        <div className="audio-top-creators__row">
          {AUDIOBOOK_NARRATORS.map((narrator) => (
            <AudioCreatorCard
              key={narrator.id}
              name={narrator.name}
              handle={narrator.handle}
              detail={narrator.detail}
              listeners={narrator.listeners}
              verified={narrator.verified}
              image={narrator.image}
              initials={narrator.initials}
              color={narrator.color}
            />
          ))}
        </div>
      </section>

      <section className="audio-live-drops" aria-label="Book clubs and live rooms">
        <div className="rail-title">
          <h3>Book clubs & live rooms</h3>
          <span className="audio-section__subtitle">Author Q&As and chapter chats</span>
        </div>
        <div className="audio-live-drops__list">
          {AUDIOBOOK_LIVE_EVENTS.map((event) => (
            <LiveEventCard key={event.id} event={event} />
          ))}
        </div>
      </section>

      <section className="audio-top-chart podcast-chart" aria-label="Top audiobooks chart">
        <div className="rail-title">
          <h3>Top Audiobooks</h3>
          <span className="audio-section__subtitle">Most listened titles this week</span>
        </div>
        <div className="audio-top-chart__panel">
          <ol className="audio-top-chart__list">
            {AUDIOBOOK_TOP_CHART.map((entry) => {
              const isPlaying = playing && activeTrackId === entry.trackId;
              return (
                <li key={entry.id} className="audio-top-chart__item">
                  <span
                    className={`audio-top-chart__rank audio-top-chart__rank--${entry.trend}`}
                    aria-label={`Rank ${entry.rank}, trending ${entry.trend}`}
                  >
                    {entry.rank}
                  </span>
                  <button
                    type="button"
                    className="audio-top-chart__hit"
                    onClick={() => onPlay(entry.trackId)}
                    aria-label={`Play ${entry.title} by ${entry.subtitle}`}
                  >
                    <span className="audio-top-chart__art">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={entry.thumbnail} alt="" />
                    </span>
                    <span className="audio-top-chart__meta">
                      <strong className="audio-top-chart__title">{entry.title}</strong>
                      <span className="audio-top-chart__artist">{entry.subtitle}</span>
                    </span>
                    <span className="audio-top-chart__plays">{formatCount(entry.plays)} plays</span>
                    <span className={`audio-top-chart__play${isPlaying ? " is-playing" : ""}`} aria-hidden="true">
                      <PlayPauseIcon playing={isPlaying} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </div>
  );
}

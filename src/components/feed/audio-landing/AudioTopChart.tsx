"use client";

import { useMemo, useState } from "react";
import {
  AUDIO_CHART_SOCIAL_OPTIONS,
  AUDIO_CHART_TIMEFRAME_OPTIONS,
  AUDIO_CHART_VIBE_OPTIONS,
  getChartMetricLabel,
  getChartSubtitle,
  getTopChart,
} from "@/data/feed/audio-landing";
import { formatCount } from "@/lib/feed/format";
import type {
  AudioChartSocial,
  AudioChartTimeframe,
  AudioChartVibe,
} from "@/types/feed/audio-landing";

function ChartPlayIcon({ playing }: { playing: boolean }) {
  if (playing) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect x="6" y="5" width="4" height="14" rx="1" />
        <rect x="14" y="5" width="4" height="14" rx="1" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86a1 1 0 0 0-1.5.86Z" />
    </svg>
  );
}

export default function AudioTopChart({
  playing,
  activeTrackId,
  onPlay,
}: {
  playing: boolean;
  activeTrackId: string;
  onPlay: (trackId: string) => void;
}) {
  const [social, setSocial] = useState<AudioChartSocial>("global");
  const [timeframe, setTimeframe] = useState<AudioChartTimeframe>("weekly");
  const [vibe, setVibe] = useState<AudioChartVibe>("all");

  const entries = useMemo(() => getTopChart(social, timeframe, vibe), [social, timeframe, vibe]);
  const subtitle = getChartSubtitle(social, timeframe, vibe);
  const metricLabel = getChartMetricLabel(timeframe, social);

  return (
    <section className="audio-top-chart" aria-label="Top music chart">
      <div className="rail-title">
        <h3>Top Music Chart</h3>
        <span className="audio-section__subtitle">{subtitle}</span>
      </div>

      <div className="audio-top-chart__panel">
        <div className="audio-top-chart__controls">
          <div className="audio-top-chart__segment" role="tablist" aria-label="Chart audience">
            {AUDIO_CHART_SOCIAL_OPTIONS.map((option) => {
              const selected = social === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`audio-top-chart__segment-btn${selected ? " is-active" : ""}`}
                  onClick={() => setSocial(option.id)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="audio-top-chart__tabs" role="tablist" aria-label="Chart timeframe">
            {AUDIO_CHART_TIMEFRAME_OPTIONS.map((option) => {
              const selected = timeframe === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`audio-top-chart__tab${selected ? " is-active" : ""}`}
                  onClick={() => setTimeframe(option.id)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="audio-top-chart__vibes" role="group" aria-label="Chart vibe">
            {AUDIO_CHART_VIBE_OPTIONS.map((option) => {
              const selected = vibe === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`audio-top-chart__vibe${selected ? " is-active" : ""}`}
                  aria-pressed={selected}
                  onClick={() => setVibe(option.id)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <ol className="audio-top-chart__list" key={`${social}-${timeframe}-${vibe}`}>
          {entries.map((entry) => {
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
                  aria-label={`Play ${entry.title} by ${entry.artist}`}
                >
                  <span className="audio-top-chart__art">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={entry.thumbnail} alt="" />
                  </span>
                  <span className="audio-top-chart__meta">
                    <strong className="audio-top-chart__title">{entry.title}</strong>
                    <span className="audio-top-chart__artist">{entry.artist}</span>
                  </span>
                  <span className="audio-top-chart__plays">
                    {formatCount(entry.plays)} {metricLabel}
                  </span>
                  <span className={`audio-top-chart__play${isPlaying ? " is-playing" : ""}`} aria-hidden="true">
                    <ChartPlayIcon playing={isPlaying} />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

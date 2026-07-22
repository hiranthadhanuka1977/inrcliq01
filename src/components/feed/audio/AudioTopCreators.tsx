"use client";

import { AUDIO_TOP_CREATORS } from "@/data/feed/audio-landing";
import AudioCreatorCard from "@/components/feed/audio/AudioCreatorCard";

export default function AudioTopCreators() {
  return (
    <section className="audio-top-creators" aria-label="Top creators">
      <div className="rail-title">
        <h3>Top Creators</h3>
        <span className="audio-section__subtitle">Artists, hosts, and narrators rising this week</span>
      </div>
      <div className="audio-top-creators__row">
        {AUDIO_TOP_CREATORS.map((creator) => (
          <AudioCreatorCard
            key={creator.id}
            name={creator.name}
            handle={creator.handle}
            detail={creator.category}
            listeners={creator.listeners}
            verified={creator.verified}
            image={creator.image}
            initials={creator.initials}
            color={creator.color}
          />
        ))}
      </div>
    </section>
  );
}

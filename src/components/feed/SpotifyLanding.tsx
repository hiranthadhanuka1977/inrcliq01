"use client";

import { getGreeting } from "@/lib/feed/format";
import { useFeedSession } from "@/context/feed/FeedSessionContext";

function initialsFromName(firstName?: string | null) {
  const name = firstName?.trim();
  if (!name) return "?";
  return name.slice(0, 2).toUpperCase();
}

export default function SpotifyLanding({ firstName }: { firstName?: string | null } = {}) {
  const { firstName: sessionFirstName } = useFeedSession();
  const name = (firstName?.trim() || sessionFirstName?.trim() || "there");

  return (
    <section className="spotify-landing" aria-label="Quick access">
      <div className="spotify-landing__intro">
        <div className="spotify-landing__greeting-row">
          <span
            className="spotify-landing__avatar spotify-landing__avatar--live"
            style={{ "--story-color": "#0d9488" } as React.CSSProperties}
            aria-hidden="true"
          >
            {initialsFromName(name === "there" ? null : name)}
          </span>
          <h1 className="spotify-landing__greeting">
            {getGreeting()}, {name}
          </h1>
        </div>
      </div>
    </section>
  );
}

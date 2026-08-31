"use client";

import Link from "next/link";
import { getGreeting } from "@/lib/feed/format";
import { useFeedSession } from "@/context/feed/FeedSessionContext";

function initialsFromName(firstName?: string | null) {
  const name = firstName?.trim();
  if (!name) return "?";
  return name.slice(0, 2).toUpperCase();
}

export default function SpotifyLanding({ firstName }: { firstName?: string | null } = {}) {
  const { firstName: sessionFirstName, avatarUrl, avatarColor, profileHref } = useFeedSession();
  const name = (firstName?.trim() || sessionFirstName?.trim() || "there");
  const avatarAccent = avatarColor?.trim() || "#0d9488";
  const avatarLink = profileHref ?? "/feed/me";

  return (
    <section className="spotify-landing" aria-label="Quick access">
      <div className="spotify-landing__intro">
        <div className="spotify-landing__greeting-row">
          <Link
            href={avatarLink}
            className="spotify-landing__avatar spotify-landing__avatar--live"
            style={{ "--story-color": avatarAccent } as React.CSSProperties}
            aria-label="View your public profile"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" width={48} height={48} />
            ) : (
              initialsFromName(name === "there" ? null : name)
            )}
          </Link>
          <h1 className="spotify-landing__greeting">
            {getGreeting()}, {name}
          </h1>
        </div>
      </div>
    </section>
  );
}

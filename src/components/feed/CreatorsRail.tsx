"use client";

import { useState } from "react";
import FollowButton from "@/components/feed/FollowButton";
import { creatorsToFollow } from "@/data/feed/creators";

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function VerifiedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 7.1-1.01L12 2z" />
    </svg>
  );
}

export default function CreatorsRail() {
  const [following, setFollowing] = useState<Record<string, boolean>>({});

  return (
    <section className="creator-rail" id="creators-rail" aria-label="Creators to follow">
      <div className="rail-title">
        <h3>Creators to follow</h3>
      </div>

      <div className="spotify-card-row creator-rail__track" id="creators-rail-row">
        {creatorsToFollow.map((creator) => {
          const isFollowing = Boolean(following[creator.id]);

          return (
            <article key={creator.id} className="spotify-card">
              <div className="spotify-card__art-wrap">
                <div className="spotify-card__art spotify-card__art--round">
                  {creator.image ? (
                    <img src={creator.image} alt="" />
                  ) : (
                    <span
                      className="spotify-card__placeholder"
                      style={{ "--story-color": creator.color } as React.CSSProperties}
                      aria-hidden="true"
                    >
                      {creator.initials}
                    </span>
                  )}
                </div>
                <FollowButton
                  following={isFollowing}
                  onFollowingChange={(next) =>
                    setFollowing((prev) => ({
                      ...prev,
                      [creator.id]: next,
                    }))
                  }
                  className="spotify-card__follow"
                  name={creator.name}
                  followContent={<PlusIcon />}
                  followingContent={<CheckIcon />}
                />
              </div>

              <span className="spotify-card__title-row">
                <span className="spotify-card__title">{creator.name}</span>
                {creator.verified ? (
                  <span className="spotify-card__verified" aria-label="Verified">
                    <VerifiedIcon />
                  </span>
                ) : null}
              </span>
              <span className="spotify-card__meta">
                {isFollowing ? "Following" : creator.handle}
                <span aria-hidden="true"> · </span>
                {creator.followers.replace(" followers", "")}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

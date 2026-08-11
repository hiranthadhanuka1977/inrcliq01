"use client";

import Link from "next/link";
import FollowButton from "@/components/feed/FollowButton";
import { useFeedFollowState } from "@/context/feed/FollowStateContext";
import { resolveAuthorProfileSlug } from "@/lib/feed/profile-slugs";

export interface AudioCreatorCardProps {
  name: string;
  handle: string;
  detail: string;
  listeners: string;
  verified?: boolean;
  image?: string;
  initials: string;
  color: string;
  /** Optional override; defaults to /profile/{slug-from-handle}. */
  href?: string;
}

function profileHrefFromHandle(handle: string): string {
  return `/feed/profile/${resolveAuthorProfileSlug(handle)}`;
}

export default function AudioCreatorCard({
  name,
  handle,
  detail,
  listeners,
  verified,
  image,
  initials,
  color,
  href,
}: AudioCreatorCardProps) {
  const { getFollowing, setFollowing } = useFeedFollowState();
  const following = getFollowing(handle, false);
  const creatorSlug = resolveAuthorProfileSlug(handle);
  const profileHref = href ?? profileHrefFromHandle(handle);

  return (
    <article className="audio-top-creator-card">
      <Link href={profileHref} className="audio-top-creator-card__hit" aria-label={`View ${name}'s profile`}>
        <span className="audio-top-creator-card__art">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" />
          ) : (
            <span
              className="audio-top-creator-card__placeholder"
              style={{ "--story-color": color } as React.CSSProperties}
              aria-hidden="true"
            >
              {initials}
            </span>
          )}
        </span>
        <span className="audio-top-creator-card__body">
          <strong className="audio-top-creator-card__name">
            {name}
            {verified ? (
              <span className="audio-top-creator-card__verified" aria-label="Verified">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 7.1-1.01L12 2z" />
                </svg>
              </span>
            ) : null}
          </strong>
          <span className="audio-top-creator-card__handle">{handle}</span>
          <span className="audio-top-creator-card__meta">
            {detail} · {listeners}
          </span>
        </span>
      </Link>
      <FollowButton
        following={following}
        onFollowingChange={(next) => setFollowing(handle, next)}
        creatorSlug={creatorSlug}
        className="audio-top-creator-card__follow"
        name={name}
        stopPropagation
      />
    </article>
  );
}

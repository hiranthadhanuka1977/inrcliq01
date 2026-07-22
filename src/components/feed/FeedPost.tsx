"use client";

import Link from "next/link";
import { useState } from "react";
import AudioFeedPlayer, { resolveAudioContentType } from "@/components/feed/AudioFeedPlayer";
import FollowButton from "@/components/feed/FollowButton";
import MediaPlayOverlay from "@/components/feed/MediaPlayOverlay";
import ShareIcon from "@/components/feed/ShareIcon";
import type { FeedItem } from "@/types/feed/feed";
import { formatCount } from "@/lib/feed/format";
import { getProfileSlugFromHandle } from "@/lib/feed/profile-slugs";

const globeSvg = (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0ZM1.5 8a6.5 6.5 0 0 1 11.3-4.5 8.4 8.4 0 0 0-2.1 1.4 5.5 5.5 0 0 0-4.4 2.1A5.5 5.5 0 0 0 3.6 9 6.4 6.4 0 0 0 1.5 8Zm13 0a6.4 6.4 0 0 0-2.1-1.5 5.5 5.5 0 0 0 .3 1.6 5.5 5.5 0 0 0-1.2 3.6A6.5 6.5 0 0 1 14.5 8ZM8 14.5a6.4 6.4 0 0 0 2.1-1.5 5.5 5.5 0 0 0-4.2-2.1 5.5 5.5 0 0 0-1.2-3.6A6.5 6.5 0 0 1 8 14.5Z" />
  </svg>
);

const lockSvg = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
  </svg>
);

const subscriberPopoverText =
  "You need to activate a subscription with this creator to access exclusive content.";

function SubscriberMediaLock() {
  return (
    <span className="post-media__subscriber-lock" aria-hidden="true">
      <span className="post-media__subscriber-lock-badge" tabIndex={0} aria-label="Subscriber access only">
        {lockSvg}
        <span className="post-media__subscriber-popover" role="tooltip">
          {subscriberPopoverText}
        </span>
      </span>
    </span>
  );
}

function PostMedia({
  media,
  membersOnly,
}: {
  media: NonNullable<FeedItem["media"]>;
  membersOnly?: boolean;
}) {
  if (media.type === "collage" && media.images.length > 1) {
    const collageClass =
      media.images.length >= 3
        ? "post-media post-media--collage post-media--collage-3"
        : "post-media post-media--collage";

    return (
      <div className={`${collageClass}${membersOnly ? " post-media--subscriber-locked" : ""}`}>
        {media.images.map((image, index) => (
          <div
            key={image.url}
            className={`post-media__cell${index === 0 ? " post-media__cell--main" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt={image.alt} />
            {!membersOnly ? <MediaPlayOverlay /> : null}
          </div>
        ))}
        {membersOnly ? <SubscriberMediaLock /> : null}
      </div>
    );
  }

  const image = media.images[0];
  if (!image) return null;

  return (
    <div className={`post-media${membersOnly ? " post-media--subscriber-locked" : ""}`}>
      {membersOnly ? (
        <div className="post-media__inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt={image.alt} />
        </div>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt={image.alt} />
          <MediaPlayOverlay />
        </>
      )}
      {membersOnly ? <SubscriberMediaLock /> : null}
    </div>
  );
}

function formatCommentCount(value: number): string {
  if (value >= 10_000) return formatCount(value);
  return value.toLocaleString();
}

export default function FeedPost({ item }: { item: FeedItem }) {
  const { author } = item;
  const [hidden, setHidden] = useState(false);
  const [following, setFollowing] = useState(item.relationship.following);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  if (hidden) return null;

  const handle = author.handle.startsWith("@") ? author.handle : `@${author.handle}`;
  const profileSlug = getProfileSlugFromHandle(author.handle);

  const avatar = (
    <div
      className="post-head__avatar"
      style={{ "--story-color": author.avatar_color } as React.CSSProperties}
      aria-hidden="true"
    >
      {author.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={author.avatar_url} alt="" />
      ) : (
        author.avatar_initials
      )}
    </div>
  );

  const name = <strong className="post-head__name">{author.name}</strong>;

  return (
    <article className="post post--simple">
      <div className="post-head">
        <div className="post-head__author">
          {profileSlug ? (
            <Link href={`/feed/profile/${profileSlug}`} className="post-head__profile-link">
              {avatar}
            </Link>
          ) : (
            avatar
          )}
          <div className="post-head__identity">
            <div className="post-head__name-row">
              {profileSlug ? (
                <Link href={`/feed/profile/${profileSlug}`} className="post-head__profile-link post-head__profile-link--name">
                  {name}
                </Link>
              ) : (
                name
              )}
              {author.verified ? (
                <span className="post-head__badge">
                  <svg className="post-head__badge-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 7.1-1.01L12 2z" />
                  </svg>
                  Verified
                </span>
              ) : null}
              <FollowButton
                following={following}
                onFollowingChange={setFollowing}
                className="post-head__follow"
                name={author.name}
              />
            </div>
            <div className="post-head__meta-line">
              <span className="post-head__handle">{handle}</span>
              <span className="post-head__meta-dot" aria-hidden="true">
                ·
              </span>
              <time className="post-head__time">{item.posted_ago}</time>
              <span className="post-head__meta-dot" aria-hidden="true">
                ·
              </span>
              <span className="post-head__globe">{globeSvg}</span>
            </div>
          </div>
        </div>
        <div className="post-head__tools">
          <button type="button" className="more" aria-label="More options">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="1.75" />
              <circle cx="12" cy="12" r="1.75" />
              <circle cx="19" cy="12" r="1.75" />
            </svg>
          </button>
          <button
            type="button"
            className="post-head__close"
            aria-label="Hide post"
            onClick={() => setHidden(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="post__body">
        {item.tags.length > 0 ? (
          <div className="post-tags">
            {item.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <p>{item.text}</p>
        {item.audio ? (
          <AudioFeedPlayer
            itemId={item.id}
            audio={item.audio}
            showName={item.author.name}
            contentType={resolveAudioContentType(item.tags)}
          />
        ) : null}
        {item.media ? <PostMedia media={item.media} membersOnly={item.members_only} /> : null}
      </div>

      <div className="post-footer">
        <div className="post-actions post-actions--engage" role="group" aria-label="Post actions">
          <button
            type="button"
            className={`post-action post-action--like${liked ? " is-liked" : ""}`}
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
            <span className="post-action__count">{formatCount(item.engagement.likes + (liked ? 1 : 0))}</span>
          </button>
          <button type="button" className="post-action post-action--comment" aria-label="Comment">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="post-action__count">{formatCommentCount(item.engagement.comments)}</span>
          </button>
          <button type="button" className="post-action post-action--share" aria-label="Share">
            <ShareIcon />
          </button>
          <button
            type="button"
            className={`post-action post-action--save${bookmarked ? " is-saved" : ""}`}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
            aria-pressed={bookmarked}
            onClick={() => setBookmarked((value) => !value)}
          >
            <svg
              viewBox="0 0 24 24"
              fill={bookmarked ? "currentColor" : "none"}
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
      </div>
    </article>
  );
}

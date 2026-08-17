"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AudioFeedPlayer, { resolveAudioContentType } from "@/components/feed/AudioFeedPlayer";
import FeedVideoViewer from "@/components/feed/FeedVideoViewer";
import FollowButton from "@/components/feed/FollowButton";
import MediaPlayOverlay from "@/components/feed/MediaPlayOverlay";
import FeedReactionButton, { type FeedReactionId } from "@/components/feed/FeedReactionButton";
import ShareIcon from "@/components/feed/ShareIcon";
import type { FeedItem } from "@/types/feed/feed";
import { formatCount } from "@/lib/feed/format";
import { resolveAuthorProfileSlug } from "@/lib/feed/profile-slugs";
import { SAMPLE_FEED_VIDEO_URL } from "@/lib/feed/sample-video";

const muteSvg = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16.5 12a4.5 4.5 0 0 0-2.25-3.9v2.18l2.2 2.2c.03-.16.05-.32.05-.48Zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A7.96 7.96 0 0 0 21 12c0-3.63-2.4-6.7-5.7-7.66v2.1A5.99 5.99 0 0 1 19 12ZM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3ZM12 4 9.91 6.09 12 8.18V4Z" />
  </svg>
);

function isPlayableVideoMedia(media: NonNullable<FeedItem["media"]>, membersOnly?: boolean): boolean {
  if (membersOnly) return false;
  if (media.video_url) return true;
  if (media.use_sample_video === false) return false;
  if (media.type === "video") return true;
  if (media.type === "collage" && media.images.length > 1) return true;
  return media.type === "image" && media.images.length === 1;
}

function canOpenMediaViewer(media: NonNullable<FeedItem["media"]>, membersOnly?: boolean): boolean {
  if (membersOnly) return false;
  return media.images.length > 0 || Boolean(media.video_url);
}

const globeSvg = (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0ZM1.5 8a6.5 6.5 0 0 1 11.3-4.5 8.4 8.4 0 0 0-2.1 1.4 5.5 5.5 0 0 0-4.4 2.1A5.5 5.5 0 0 0 3.6 9 6.4 6.4 0 0 0 1.5 8Zm13 0a6.4 6.4 0 0 0-2.1-1.5 5.5 5.5 0 0 0 .3 1.6 5.5 5.5 0 0 0-1.2 3.6A6.5 6.5 0 0 1 14.5 8ZM8 14.5a6.4 6.4 0 0 0 2.1-1.5 5.5 5.5 0 0 0-4.2-2.1 5.5 5.5 0 0 0-1.2-3.6A6.5 6.5 0 0 1 8 14.5Z" />
  </svg>
);

const crownSvg = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3 7.5a1 1 0 0 1 1.64-.77L9.5 11l2.06-6.19a1 1 0 0 1 1.88 0L15.5 11l4.86-4.27A1 1 0 0 1 22 7.5l-2.2 10.2a2 2 0 0 1-1.96 1.58H6.16A2 2 0 0 1 4.2 17.7L3 7.5Zm4.25 13.75a1 1 0 1 0 0 2h9.5a1 1 0 1 0 0-2h-9.5Z" />
  </svg>
);

const lockSvg = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
  </svg>
);

const subscriberPopoverText =
  "You need to activate a subscription with this creator to access exclusive content.";

function formatPostContext(media: FeedItem["media"]) {
  if (!media) return null;
  const parts: string[] = [];
  if (media.feeling) {
    parts.push(
      media.feeling.kind === "activity"
        ? `is ${media.feeling.label} ${media.feeling.emoji}`
        : `is feeling ${media.feeling.label} ${media.feeling.emoji}`,
    );
  }
  if (media.location?.label) {
    parts.push(`at ${media.location.label.split(",")[0]}`);
  }
  const tagged = media.tagged ?? [];
  if (tagged.length === 1) {
    parts.push(`with ${tagged[0].name}`);
  } else if (tagged.length === 2) {
    parts.push(`with ${tagged[0].name} and ${tagged[1].name}`);
  } else if (tagged.length > 2) {
    parts.push(`with ${tagged[0].name} and ${tagged.length - 1} others`);
  }
  if (!parts.length) return null;
  return <span className="post-head__context">{parts.join(" · ")}</span>;
}

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
  onOpenMedia,
  previewPaused = false,
}: {
  media: NonNullable<FeedItem["media"]>;
  membersOnly?: boolean;
  onOpenMedia?: (index?: number) => void;
  previewPaused?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const showVideo = isPlayableVideoMedia(media, membersOnly);
  const canOpen = Boolean(onOpenMedia);
  const poster = media.images[0] ?? null;
  const videoSrc = media.video_url || SAMPLE_FEED_VIDEO_URL;
  const hasVisual = media.images.length > 0 || Boolean(media.video_url);

  useEffect(() => {
    if (!showVideo || media.type === "collage") return;
    const video = videoRef.current;
    if (!video) return;

    if (previewPaused) {
      video.pause();
      return;
    }

    void video.play().then(() => setPreviewing(true)).catch(() => setPreviewing(false));
  }, [showVideo, videoSrc, previewPaused, media.type]);

  if (!hasVisual) return null;

  if (media.type === "collage" && media.images.length > 1) {
    const collageClass =
      media.images.length >= 3
        ? "post-media post-media--collage post-media--collage-3"
        : "post-media post-media--collage";

    return (
      <div
        className={`${collageClass}${membersOnly ? " post-media--subscriber-locked" : ""}${
          !membersOnly && canOpen ? " post-media--collage-video" : ""
        }`}
      >
        {media.images.map((image, index) => (
          <div
            key={image.url}
            className={`post-media__cell${index === 0 ? " post-media__cell--main" : ""}`}
            role={!membersOnly && canOpen ? "button" : undefined}
            tabIndex={!membersOnly && canOpen ? 0 : undefined}
            aria-label={
              !membersOnly && canOpen
                ? showVideo
                  ? `Play video ${index + 1}`
                  : `View photo ${index + 1}`
                : undefined
            }
            onClick={
              !membersOnly && onOpenMedia
                ? () => {
                    onOpenMedia(index);
                  }
                : undefined
            }
            onKeyDown={
              !membersOnly && onOpenMedia
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpenMedia(index);
                    }
                  }
                : undefined
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt={image.alt} />
            {!membersOnly && showVideo ? <MediaPlayOverlay /> : null}
          </div>
        ))}
        {membersOnly ? <SubscriberMediaLock /> : null}
      </div>
    );
  }

  if (!poster) return null;

  if (showVideo && onOpenMedia) {
    return (
      <div
        className={`post-media post-media--video${previewing ? " is-previewing" : ""}`}
        role="button"
        tabIndex={0}
        aria-label="Play video"
        onClick={() => {
          videoRef.current?.pause();
          onOpenMedia(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            videoRef.current?.pause();
            onOpenMedia(0);
          }
        }}
      >
        <video
          ref={videoRef}
          className="post-media__video"
          src={videoSrc}
          poster={poster.url}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
        <MediaPlayOverlay />
        <span className="post-media__mute-badge" aria-hidden="true">
          {muteSvg}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`post-media${membersOnly ? " post-media--subscriber-locked" : ""}${
        !membersOnly && canOpen ? " post-media--photo" : ""
      }`}
      role={!membersOnly && canOpen ? "button" : undefined}
      tabIndex={!membersOnly && canOpen ? 0 : undefined}
      aria-label={!membersOnly && canOpen ? "View photo" : undefined}
      onClick={
        !membersOnly && onOpenMedia
          ? () => {
              onOpenMedia(0);
            }
          : undefined
      }
      onKeyDown={
        !membersOnly && onOpenMedia
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpenMedia(0);
              }
            }
          : undefined
      }
    >
      {membersOnly ? (
        <div className="post-media__inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster.url} alt={poster.alt} />
        </div>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster.url} alt={poster.alt} />
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

type FeedPostProps = {
  item: FeedItem;
  following?: boolean;
  onFollowingChange?: (next: boolean) => void;
  hideFollow?: boolean;
};

export default function FeedPost({ item, following, onFollowingChange, hideFollow = false }: FeedPostProps) {
  const { author } = item;
  const [hidden, setHidden] = useState(false);
  const [localFollowing, setLocalFollowing] = useState(item.relationship.following);
  const [reaction, setReaction] = useState<FeedReactionId | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerMode, setViewerMode] = useState<"media" | "comments">("media");
  const [videoIndex, setVideoIndex] = useState(0);

  useEffect(() => {
    setLocalFollowing(item.relationship.following);
  }, [item.id, item.relationship.following]);

  if (hidden) return null;

  const handle = author.handle.startsWith("@") ? author.handle : `@${author.handle}`;
  const profileSlug = resolveAuthorProfileSlug(author.handle, author.slug);
  const creatorSlug = profileSlug;
  const isFollowing = following ?? localFollowing;
  const canOpenMedia = item.media ? canOpenMediaViewer(item.media, item.members_only) : false;
  const playableVideo = item.media ? isPlayableVideoMedia(item.media, item.members_only) : false;
  const canOpenComments = !item.members_only;
  const openMedia = (index = 0) => {
    setVideoIndex(index);
    setViewerMode("media");
    setViewerOpen(true);
  };
  const openComments = () => {
    setVideoIndex(0);
    setViewerMode("comments");
    setViewerOpen(true);
  };

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
  const context = formatPostContext(item.media);

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
              {context}
              {item.relationship.subscribed ? (
                <span
                  className="post-head__badge post-head__badge--subscribed post-head__badge--icon-only"
                  title="Subscribed"
                  aria-label="Subscribed"
                >
                  <span className="post-head__badge-icon">{crownSvg}</span>
                </span>
              ) : null}
              {author.verified ? (
                <span className="post-head__badge">
                  <svg className="post-head__badge-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 7.1-1.01L12 2z" />
                  </svg>
                  Verified
                </span>
              ) : null}
              {!hideFollow ? (
                <FollowButton
                  following={isFollowing}
                  onFollowingChange={(next) => {
                    if (onFollowingChange) {
                      onFollowingChange(next);
                      return;
                    }
                    setLocalFollowing(next);
                  }}
                  creatorSlug={creatorSlug}
                  className="post-head__follow"
                  name={author.name}
                />
              ) : null}
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
        {item.text ? <p>{item.text}</p> : null}
        {item.audio ? (
          <AudioFeedPlayer
            itemId={item.id}
            audio={item.audio}
            showName={item.author.name}
            contentType={resolveAudioContentType(item.tags)}
          />
        ) : null}
        {item.media ? (
          <PostMedia
            media={item.media}
            membersOnly={item.members_only}
            onOpenMedia={canOpenMedia ? openMedia : undefined}
            previewPaused={viewerOpen}
          />
        ) : null}
      </div>

      <div className="post-footer">
        <div className="post-actions post-actions--engage" role="group" aria-label="Post actions">
          <FeedReactionButton
            count={item.engagement.likes}
            reaction={reaction}
            onReactionChange={setReaction}
          />
          <button
            type="button"
            className="post-action post-action--comment"
            aria-label="Comment"
            onClick={canOpenComments ? openComments : undefined}
          >
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

      {canOpenComments || canOpenMedia ? (
        <FeedVideoViewer
          item={item}
          slides={item.media?.images ?? []}
          initialIndex={videoIndex}
          open={viewerOpen}
          mode={viewerMode}
          videoSrc={
            playableVideo ? item.media?.video_url || SAMPLE_FEED_VIDEO_URL : null
          }
          onClose={() => setViewerOpen(false)}
        />
      ) : null}
    </article>
  );
}

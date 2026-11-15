"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import { postShareHref, postSharePayload } from "@/lib/feed/post-share-message";
import { SAMPLE_FEED_VIDEO_URL } from "@/lib/feed/sample-video";
import type { FeedItem } from "@/types/feed/feed";

function videoFrame(item: FeedItem) {
  if (item.members_only) return null;
  const media = item.media;
  if (!media) return null;
  const clip = media.items?.find((entry) => entry.type === "video" && entry.url);
  if (clip) return clip.poster ? null : `${clip.url}#t=0.1`;
  if (media.images?.[0]?.url) return null;
  if (media.video_url) return `${media.video_url}#t=0.1`;
  if (media.type === "video") return `${SAMPLE_FEED_VIDEO_URL}#t=0.1`;
  return null;
}

function savedPreview(item: FeedItem) {
  const share = postSharePayload(item);
  const audio = item.audios?.[0] ?? item.audio ?? null;
  const audioThumb = audio?.thumbnail?.url?.trim() || null;
  const imageUrl = share.imageUrl || (share.membersOnly ? null : audioThumb);
  const videoSrc = imageUrl ? null : videoFrame(item);
  const kind = share.membersOnly
    ? "Members"
    : share.hasVideo
      ? "Video"
      : audio
        ? "Audio"
        : imageUrl
          ? "Photo"
          : "Post";
  const text = share.membersOnly
    ? "Members only"
    : share.text || audio?.title || (share.hasVideo ? "Video" : imageUrl ? "Photo" : "Saved post");

  return { ...share, imageUrl, videoSrc, kind, text };
}

const SAVED_FILTERS = ["All", "Video", "Audio", "Photo", "Post", "Members"] as const;
type SavedFilter = (typeof SAVED_FILTERS)[number];

function savedKind(item: FeedItem) {
  return savedPreview(item).kind;
}

function SavedTile({
  item,
  removing,
  onRemove,
}: {
  item: FeedItem;
  removing: boolean;
  onRemove: () => void;
}) {
  const preview = savedPreview(item);
  const author = item.author;
  const handle = preview.authorHandle;

  return (
    <li className="saved-tile">
      <Link href={postShareHref(item.id)} className="saved-tile__link">
        <span className="saved-tile__media">
          {preview.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.imageUrl} alt={preview.imageAlt || ""} />
          ) : preview.videoSrc ? (
            <video src={preview.videoSrc} muted playsInline preload="metadata" aria-hidden="true" />
          ) : (
            <span className="saved-tile__fallback">{preview.text}</span>
          )}
          {preview.hasVideo ? <span className="messages-post-share__play" aria-hidden="true" /> : null}
          <span className="saved-tile__kind">{preview.kind}</span>
        </span>
        <span className="saved-tile__copy">
          <span className="saved-tile__who">
            <span
              className="saved-tile__avatar"
              style={{ "--story-color": author.avatar_color } as CSSProperties}
              aria-hidden="true"
            >
              {author.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={author.avatar_url} alt="" />
              ) : (
                author.avatar_initials
              )}
            </span>
            <span className="saved-tile__name">{author.name}</span>
          </span>
          {handle ? <span className="saved-tile__handle">{handle}</span> : null}
          {preview.imageUrl || preview.videoSrc ? <span className="saved-tile__text">{preview.text}</span> : null}
        </span>
      </Link>
      <button
        type="button"
        className="saved-tile__remove"
        aria-label={`Remove ${author.name}'s post from Saved`}
        disabled={removing}
        onClick={onRemove}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    </li>
  );
}

function SavedFeedContent({
  items,
  profileHref,
}: {
  items: FeedItem[];
  profileHref: string;
}) {
  const [visibleItems, setVisibleItems] = useState(items);
  const [filter, setFilter] = useState<SavedFilter>("All");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const filters = useMemo(() => {
    const present = new Set(visibleItems.map(savedKind));
    return SAVED_FILTERS.filter((option) => option === "All" || present.has(option));
  }, [visibleItems]);
  const activeFilter = filters.includes(filter) ? filter : "All";
  const shownItems =
    activeFilter === "All" ? visibleItems : visibleItems.filter((item) => savedKind(item) === activeFilter);

  async function remove(item: FeedItem) {
    if (removingId) return;
    setRemovingId(item.id);
    setError(null);
    try {
      const response = await fetch("/api/feed/bookmarks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: item.id }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error || "Could not remove that saved post.");
        return;
      }
      setVisibleItems((current) => current.filter((post) => post.id !== item.id));
    } catch {
      setError("Could not remove that saved post.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <>
      <div className="app-shell">
        <LeftNav />
        <div className="main-content">
          <div className="content-layout">
            <div className="content-row">
              <main className="feed-main feed-surface feed-surface--simple" aria-labelledby="saved-heading">
                <h1 id="saved-heading" className="saved-feed__title">
                  Saved
                </h1>
                {visibleItems.length > 0 ? (
                  <div className="saved-feed__filters" role="tablist" aria-label="Filter saved posts">
                    {filters.map((option) => {
                      const selected = option === activeFilter;
                      return (
                        <button
                          key={option}
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          className={`saved-feed__filter${selected ? " is-active" : ""}`}
                          onClick={() => setFilter(option)}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {error ? (
                  <p className="saved-feed__error" role="alert">
                    {error}
                  </p>
                ) : null}
                {visibleItems.length === 0 ? (
                  <div className="saved-feed-empty">
                    <p>Nothing is saved yet.</p>
                    <Link href={profileHref} className="saved-feed-empty__back">
                      Back to profile
                    </Link>
                  </div>
                ) : (
                  <ul className="saved-feed__grid">
                    {shownItems.map((item) => (
                      <SavedTile
                        key={item.id}
                        item={item}
                        removing={removingId === item.id}
                        onRemove={() => void remove(item)}
                      />
                    ))}
                  </ul>
                )}
              </main>
            </div>
          </div>
        </div>
      </div>
      <MobileNav />
    </>
  );
}

export default function SavedFeed({
  items,
  profileHref,
}: {
  items: FeedItem[];
  profileHref: string | null;
}) {
  return <SavedFeedContent items={items} profileHref={profileHref ?? "/feed/me"} />;
}

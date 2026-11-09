"use client";

import { useMemo, useState, type CSSProperties } from "react";
import ShelfScroller from "@/components/feed/ShelfScroller";
import VideoShelfCard from "@/components/feed/VideoShelfCard";
import { VideoShelfToast, visibleShelfItems } from "@/components/feed/VideoThumbMenu";
import type { VideoShelfItem } from "@/lib/feed/video-shelf";
import { authorShelfKey, restoreHiddenShelfItems, useShelfPrefs } from "@/lib/feed/video-shelf-menu";

const RAIL_LIMIT = 12;
const FOR_YOU_LIMIT = 10;

type ShelfFocus = "latest" | "foryou" | "members" | "liked";

type CreatorChip = {
  key: string;
  name: string;
  avatarUrl: string | null;
  initials: string;
  color: string;
  count: number;
};

function labelFor(category: string) {
  if (category === "discovery") return "Discovery";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function byLikes(a: VideoShelfItem, b: VideoShelfItem) {
  return b.likes - a.likes || b.postedAtMs - a.postedAtMs;
}

/** One video from each category in turn, so the two rows are a mix rather than a copy of Latest. */
function forYouMix(videos: VideoShelfItem[]) {
  const groups = new Map<string, VideoShelfItem[]>();
  for (const video of videos) {
    const list = groups.get(video.category) ?? [];
    list.push(video);
    groups.set(video.category, list);
  }
  const queues = [...groups.values()];
  const mixed: VideoShelfItem[] = [];
  let pending = true;
  while (pending) {
    pending = false;
    for (const queue of queues) {
      const next = queue.shift();
      if (!next) continue;
      mixed.push(next);
      pending = true;
    }
  }
  return mixed;
}

function creatorsFrom(videos: VideoShelfItem[]): CreatorChip[] {
  const map = new Map<string, CreatorChip>();
  for (const video of videos) {
    const key = authorShelfKey(video);
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    map.set(key, {
      key,
      name: video.authorName,
      avatarUrl: video.avatarUrl,
      initials: video.avatarInitials,
      color: video.avatarColor,
      count: 1,
    });
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function ShelfRail({
  title,
  subtitle,
  items,
  onSeeAll,
}: {
  title: string;
  subtitle: string;
  items: VideoShelfItem[];
  onSeeAll: () => void;
}) {
  if (!items.length) return null;
  const shown = items.slice(0, RAIL_LIMIT);
  return (
    <section className="yt-shelf" aria-label={title}>
      <div className="yt-shelf__head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {items.length > RAIL_LIMIT ? (
          <button type="button" onClick={onSeeAll}>
            See all
          </button>
        ) : null}
      </div>
      <ShelfScroller label={title} resetKey={shown.map((video) => video.key).join("|")}>
        {shown.map((video) => (
          <VideoShelfCard key={video.key} item={video} />
        ))}
      </ShelfScroller>
    </section>
  );
}

export default function VideoShelfView({
  videos,
  categories,
}: {
  videos: VideoShelfItem[];
  categories: string[];
}) {
  const [category, setCategory] = useState<string | null>(null);
  const [creatorKey, setCreatorKey] = useState<string | null>(null);
  const [focus, setFocus] = useState<ShelfFocus | null>(null);
  const prefs = useShelfPrefs();
  const available = useMemo(() => visibleShelfItems(videos, prefs), [videos, prefs]);
  const inCategory = useMemo(
    () => (category ? available.filter((item) => item.category === category) : available),
    [category, available],
  );
  const creators = useMemo(() => creatorsFrom(inCategory), [inCategory]);
  const creator = creators.find((item) => item.key === creatorKey) ?? null;
  const scoped = useMemo(
    () => (creator ? inCategory.filter((item) => authorShelfKey(item) === creator.key) : inCategory),
    [creator, inCategory],
  );
  const forYou = useMemo(() => forYouMix(scoped), [scoped]);
  const members = useMemo(() => scoped.filter((item) => item.membersOnly), [scoped]);
  const liked = useMemo(() => scoped.filter((item) => item.likes > 0).sort(byLikes), [scoped]);
  const categoryLabel = category ? labelFor(category) : "";
  const latestSubtitle = category ? `New videos in ${categoryLabel}` : "New videos from every category";

  const chooseCategory = (value: string | null) => {
    setCategory(value);
    setFocus(null);
  };

  const chooseCreator = (key: string) => {
    setCreatorKey((current) => (current === key ? null : key));
    setFocus(null);
  };

  const focusedItems =
    focus === "members"
      ? members
      : focus === "liked"
        ? liked
        : focus === "foryou"
          ? forYou
          : focus === "latest"
            ? scoped
            : null;
  const focusedTitle =
    focus === "members"
      ? "Members"
      : focus === "liked"
        ? "Most liked"
        : focus === "foryou"
          ? "For you"
          : focus === "latest"
            ? "Latest"
            : "";

  return (
    <>
      {categories.length > 0 ? (
        <div className="yt-filters" role="toolbar" aria-label="Filter by category">
          <button type="button" aria-pressed={category === null} onClick={() => chooseCategory(null)}>
            All
          </button>
          {categories.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={category === value}
              onClick={() => chooseCategory(value)}
            >
              {labelFor(value)}
            </button>
          ))}
        </div>
      ) : null}

      {creators.length > 0 ? (
        <section className="yt-creators" aria-label="Creators">
          <div className="yt-shelf__head">
            <div>
              <h2>Creators</h2>
              <p>Choose someone to see only their videos</p>
            </div>
          </div>
          <ShelfScroller
            label="Creators"
            align="people"
            resetKey={creators.map((person) => person.key).join("|")}
          >
            {creators.map((person) => (
              <button
                key={person.key}
                type="button"
                className={`yt-creator${creator?.key === person.key ? " is-selected" : ""}`}
                aria-pressed={creator?.key === person.key}
                onClick={() => chooseCreator(person.key)}
              >
                <span
                  className="yt-creator__avatar"
                  style={{ "--story-color": person.color } as CSSProperties}
                >
                  {person.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={person.avatarUrl} alt="" />
                  ) : (
                    person.initials
                  )}
                </span>
                <span className="yt-creator__name">{person.name}</span>
                <span className="yt-creator__count">
                  {person.count} {person.count === 1 ? "video" : "videos"}
                </span>
              </button>
            ))}
          </ShelfScroller>
        </section>
      ) : null}

      {focusedItems ? (
        <section className="yt-shelf" aria-label={focusedTitle}>
          <div className="yt-shelf__head">
            <div>
              <h2>{focusedTitle}</h2>
              <p>
                {focusedItems.length} {focusedItems.length === 1 ? "video" : "videos"}
              </p>
            </div>
            <button type="button" onClick={() => setFocus(null)}>
              All sections
            </button>
          </div>
          <div className="yt-grid">
            {focusedItems.map((video) => (
              <VideoShelfCard key={video.key} item={video} />
            ))}
          </div>
        </section>
      ) : creator ? (
        <section className="yt-shelf" aria-label={`Videos by ${creator.name}`}>
          <div className="yt-shelf__head">
            <div>
              <h2>{creator.name}</h2>
              <p>
                {scoped.length} {scoped.length === 1 ? "video" : "videos"}
                {category ? ` in ${categoryLabel}` : ""}
              </p>
            </div>
            <button type="button" onClick={() => setCreatorKey(null)}>
              All creators
            </button>
          </div>
          {scoped.length === 0 ? (
            <p className="yt-page__empty">
              No videos from {creator.name}
              {category ? ` in ${categoryLabel}` : ""}.
            </p>
          ) : (
            <div className="yt-grid">
              {scoped.map((video) => (
                <VideoShelfCard key={video.key} item={video} />
              ))}
            </div>
          )}
        </section>
      ) : scoped.length === 0 ? (
        <p className="yt-page__empty">
          {category
            ? `No videos in ${categoryLabel}.`
            : videos.length
              ? "Hidden videos stay off this page until you show them again."
              : "No videos yet. Videos added to a post show up here, including each video from a post that mixes photos and videos."}
        </p>
      ) : (
        <div className="yt-shelves">
          <ShelfRail
            title="Latest"
            subtitle={latestSubtitle}
            items={scoped}
            onSeeAll={() => setFocus("latest")}
          />
          {forYou.length > 0 ? (
            <section className="yt-shelf" aria-label="For you">
              <div className="yt-shelf__head">
                <div>
                  <h2>For you</h2>
                  <p>{category ? `A mix from ${categoryLabel}` : "A mix from every category"}</p>
                </div>
                {forYou.length > FOR_YOU_LIMIT ? (
                  <button type="button" onClick={() => setFocus("foryou")}>
                    See all
                  </button>
                ) : null}
              </div>
              <div className="yt-foryou">
                {forYou.slice(0, FOR_YOU_LIMIT).map((video) => (
                  <VideoShelfCard key={video.key} item={video} />
                ))}
              </div>
            </section>
          ) : null}
          <ShelfRail
            title="Members"
            subtitle="Videos for subscribers"
            items={members}
            onSeeAll={() => setFocus("members")}
          />
          <ShelfRail
            title="Most liked"
            subtitle="Ordered by likes"
            items={liked}
            onSeeAll={() => setFocus("liked")}
          />
        </div>
      )}

      {prefs.hiddenKeys.length || prefs.hiddenAuthors.length ? (
        <button type="button" className="yt-page__restore" onClick={restoreHiddenShelfItems}>
          Show hidden videos
        </button>
      ) : null}
      <VideoShelfToast />
    </>
  );
}

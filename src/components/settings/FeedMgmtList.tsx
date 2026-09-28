"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { formatCount } from "@/components/settings/DashboardParts";
import type { SettingsFeedPostRow } from "@/lib/settings/feed-posts";

const PAGE_SIZE = 50;

const KIND_LABELS: Record<SettingsFeedPostRow["kind"], string> = {
  image: "Image",
  collage: "Collage",
  video: "Video",
  audio: "Audio",
  text: "Text only",
};

type SourceFilter = "all" | "member" | "seeded";

function atHandle(handle: string) {
  return `@${handle.replace(/^@/, "")}`;
}

function formatTimestamp(iso: string) {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

function matchesSearch(post: SettingsFeedPostRow, query: string) {
  if (!query) return true;
  return [
    post.id,
    post.text,
    post.creator.name,
    post.creator.handle,
    post.authorUser?.email ?? "",
    ...post.tags,
  ].some((value) => value.toLowerCase().includes(query));
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

function Prop({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="settings-props__row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function FeedPostCard({ post }: { post: SettingsFeedPostRow }) {
  const { media, audio, video, creator } = post;
  const images = media?.images ?? [];

  return (
    <article className="settings-feed-item">
      <header className="settings-feed-item__head">
        <span className="settings-feed-item__position">#{post.position}</span>
        <span className="settings-feed-item__creator">
          <strong>{creator.name}</strong>
          <span className="settings-ranking__handle">{atHandle(creator.handle)}</span>
        </span>
        <span className="settings-feed-item__tags">
          <span className="settings-tag">{post.category}</span>
          <span className="settings-tag">{KIND_LABELS[post.kind]}</span>
          <span className="settings-tag">{post.seeded ? "Seeded" : "Member post"}</span>
          {post.membersOnly ? <span className="settings-tag">Members only</span> : null}
        </span>
      </header>

      {post.text ? (
        <p className="settings-feed-item__text">{post.text}</p>
      ) : (
        <p className="settings-feed-item__text settings-card__hint">No text.</p>
      )}

      <dl className="settings-props">
        <Prop label="Post ID">
          <code>{post.id}</code>
        </Prop>
        <Prop label="Creator">
          {creator.slug ? (
            <Link href={`/feed/profile/${creator.slug}`} target="_blank">
              {creator.name}
            </Link>
          ) : (
            creator.name
          )}{" "}
          ({atHandle(creator.handle)}) · source {creator.source}
          {creator.verified ? " · verified" : ""}
        </Prop>
        <Prop label="Author account">
          {post.authorUser ? `${post.authorUser.name} · ${post.authorUser.email}` : "None"}
        </Prop>
        <Prop label="Tags">
          {post.tags.length ? post.tags.map((tag) => `#${tag}`).join(" ") : "None"}
        </Prop>
        <Prop label="Images">
          {images.length ? (
            <ol className="settings-props__links">
              {images.map((image, index) => (
                <li key={`${image.url}-${index}`}>
                  <ExternalLink href={image.url}>Image {index + 1}</ExternalLink>
                  {image.alt ? <span className="settings-props__note"> · {image.alt}</span> : null}
                </li>
              ))}
            </ol>
          ) : (
            "None"
          )}
        </Prop>
        <Prop label="Video">
          {video ? (
            <>
              <ExternalLink href={video.url}>{video.isSample ? "Sample video" : "Video file"}</ExternalLink>
              {video.isSample ? (
                <span className="settings-props__note"> · shared placeholder clip, no video stored</span>
              ) : null}
              {post.membersOnly ? (
                <span className="settings-props__note"> · not played in the feed (members only)</span>
              ) : null}
            </>
          ) : (
            "None"
          )}
        </Prop>
        {audio ? (
          <Prop label="Audio">
            {audio.title} · {audio.duration} ·{" "}
            {audio.audio_url ? <ExternalLink href={audio.audio_url}>Audio file</ExternalLink> : "no audio file"}
            {audio.thumbnail?.url ? (
              <>
                {" · "}
                <ExternalLink href={audio.thumbnail.url}>Thumbnail</ExternalLink>
              </>
            ) : null}
          </Prop>
        ) : null}
        {media?.feeling ? (
          <Prop label={media.feeling.kind === "activity" ? "Activity" : "Feeling"}>
            {media.feeling.emoji} {media.feeling.label}
          </Prop>
        ) : null}
        {media?.location ? (
          <Prop label="Location">
            {media.location.label}
            {media.location.lat != null && media.location.lng != null
              ? ` (${media.location.lat}, ${media.location.lng})`
              : ""}
          </Prop>
        ) : null}
        {media?.tagged?.length ? (
          <Prop label="Tagged">
            {media.tagged.map((person) => `${person.name} (${atHandle(person.handle)})`).join(", ")}
          </Prop>
        ) : null}
        <Prop label="Engagement">
          {formatCount(post.likes)} likes · {formatCount(post.comments)} comments ·{" "}
          {formatCount(post.shares)} shares
        </Prop>
        <Prop label="Flags">
          Following {post.following ? "yes" : "no"} · Members only {post.membersOnly ? "yes" : "no"} · Sort
          order {post.sortOrder}
        </Prop>
        <Prop label="Posted">
          {formatTimestamp(post.postedAt)}
          {post.postedAgo ? ` · shown as "${post.postedAgo}"` : ""}
        </Prop>
        <Prop label="Record">
          Created {formatTimestamp(post.createdAt)} · Updated {formatTimestamp(post.updatedAt)}
        </Prop>
      </dl>

      {media || audio ? (
        <details className="settings-feed-item__raw">
          <summary>Raw media and audio data</summary>
          <pre>{JSON.stringify({ mediaJson: media, audioJson: audio }, null, 2)}</pre>
        </details>
      ) : null}
    </article>
  );
}

export function FeedMgmtList({ posts }: { posts: SettingsFeedPostRow[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [source, setSource] = useState<SourceFilter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const categories = useMemo(
    () => [...new Set(posts.map((post) => post.category))].sort(),
    [posts],
  );

  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return posts.filter(
      (post) =>
        (category === "all" || post.category === category) &&
        (source === "all" || (source === "seeded") === post.seeded) &&
        matchesSearch(post, query),
    );
  }, [posts, searchQuery, category, source]);

  const visiblePosts = filteredPosts.slice(0, visibleCount);

  function resetPaging() {
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <div className="settings-panel">
      <div className="settings-panel__head">
        <h1 className="settings-panel__title">Feed Mgmt</h1>
        <p className="settings-panel__subtitle">
          Every post in the feed, in the order the home feed shows them.
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="settings-empty">There are no feed posts yet.</p>
      ) : (
        <>
          <div className="settings-filters">
            <div className="settings-search">
              <label className="sr-only" htmlFor="settings-feed-search">
                Search posts
              </label>
              <input
                type="search"
                id="settings-feed-search"
                className="input settings-search__input"
                placeholder="Search text, creator, tag, email or post ID"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  resetPaging();
                }}
                autoComplete="off"
              />
            </div>
            <label className="sr-only" htmlFor="settings-feed-category">
              Category
            </label>
            <select
              id="settings-feed-category"
              className="input settings-filters__select"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                resetPaging();
              }}
            >
              <option value="all">All categories</option>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="settings-feed-source">
              Source
            </label>
            <select
              id="settings-feed-source"
              className="input settings-filters__select"
              value={source}
              onChange={(event) => {
                setSource(event.target.value as SourceFilter);
                resetPaging();
              }}
            >
              <option value="all">Member and seeded posts</option>
              <option value="member">Member posts only</option>
              <option value="seeded">Seeded posts only</option>
            </select>
          </div>

          <p className="settings-message">
            Showing {formatCount(visiblePosts.length)} of {formatCount(filteredPosts.length)} posts
            {filteredPosts.length !== posts.length ? ` (${formatCount(posts.length)} in total)` : ""}.
          </p>

          {filteredPosts.length === 0 ? (
            <p className="settings-empty">No posts match these filters.</p>
          ) : (
            <div className="settings-feed-list">
              {visiblePosts.map((post) => (
                <FeedPostCard key={post.id} post={post} />
              ))}
            </div>
          )}

          {visiblePosts.length < filteredPosts.length ? (
            <button
              type="button"
              className="btn btn--secondary settings-feed-list__more"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              Show {formatCount(Math.min(PAGE_SIZE, filteredPosts.length - visiblePosts.length))} more
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

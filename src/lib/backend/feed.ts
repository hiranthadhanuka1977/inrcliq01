import { NextResponse } from "next/server";
import { callBackend } from "./client";
import { errorCopy } from "./mappers";
import { getBackendUser } from "./session";
import { UPLOAD_PURPOSE, checkFile, uploadRules } from "./enums";
import type { FeedData, FeedItem, FeedImage, FeedMedia } from "@/types/feed/feed";

/**
 * The feed, served from the API instead of the local database.
 *
 * `getFeedData()` reads four tables and a JSON fixture; none of that exists
 * behind the API, so this assembles the same `FeedItem[]` from `GET /feed` and
 * the feed components stay untouched.
 *
 * The two vocabularies differ in ways worth naming:
 *
 *   - the API stores a handle bare, the components print `@handle`;
 *   - the API returns one ordered `media[]`, the components want a `FeedMedia`
 *     with a `type` discriminator and a separate `video_url`;
 *   - `posted_ago` is a *rendered* string in the prototype. The API sends only
 *     `postedAt`, which is right — a stored "2 hours ago" is wrong the moment
 *     it is written — so it is computed here, at read time.
 */

/** How much of the feed one page of the prototype shows. */
const FEED_PAGE = 30;

interface ApiAuthor {
  profileId: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  verified: boolean;
}

interface ApiMedia {
  id: string;
  kind: "IMAGE" | "VIDEO" | "GIF";
  url: string;
  ordinal: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  posterUrl: string | null;
  altText: string | null;
}

interface ApiPost {
  id: string;
  author: ApiAuthor;
  text: string | null;
  media: ApiMedia[];
  taggedPeople: ApiAuthor[];
  feelingLabel: string | null;
  feelingIcon: string | null;
  place: { name: string; lat: number | null; lng: number | null } | null;
  visibility: "PUBLIC" | "SUBSCRIBERS";
  locked: boolean;
  postedAt: string;
  editedAt: string | null;
  counts: { likes: number; comments: number; shares: number; bookmarks: number };
  viewer: { liked: boolean; bookmarked: boolean; followingAuthor: boolean; isAuthor: boolean };
}

interface ApiPage {
  items: ApiPost[];
  nextCursor: string | null;
}

// ── Mapping ─────────────────────────────────────────────────────────────────

/** "Just now", "30m", "2h", "1d", "4w" — the form section 2 of the spec asks for. */
function postedAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  const weeks = Math.floor(days / 7);
  if (weeks < 52) return `${weeks}w`;

  return `${Math.floor(days / 365)}y`;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0] ?? "").join("").toUpperCase() || "ME";
}

/**
 * A stable colour per profile, so an avatar without a picture does not change
 * hue every time the feed reloads.
 */
function avatarColor(seed: string): string {
  const palette = ["#6b9fff", "#f58a8a", "#7ed6a5", "#f5c26b", "#b89cf5", "#66c7d9"];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length]!;
}

function toAuthor(author: ApiAuthor) {
  return {
    name: author.name,
    // The API stores the handle bare; every screen prints it with the @.
    handle: author.handle ? `@${author.handle}` : "@user",
    // There is no slug any more — a profile is reached by its handle.
    slug: author.handle,
    avatar_initials: initialsOf(author.name),
    avatar_color: avatarColor(author.profileId),
    avatar_url: author.avatarUrl,
    verified: author.verified,
  };
}

/**
 * The API's flat, ordered `media[]` as the shape the feed components read.
 *
 * A locked post arrives with no media at all — the API does not serialise paid
 * content to someone who has not paid — so this returns null and the card falls
 * back to its locked state.
 */
function toMedia(post: ApiPost): FeedMedia | null {
  const hasContext = Boolean(post.place || post.feelingLabel || post.taggedPeople.length > 0);

  if (post.media.length === 0) {
    // No media, but there may still be a check-in, a feeling or tagged people —
    // all of which the components read off this same object.
    if (!hasContext) return null;
    return {
      type: "image",
      images: [],
      use_sample_video: false,
      ...contextOf(post),
    };
  }

  const video = post.media.find((item) => item.kind === "VIDEO");
  const images: FeedImage[] = post.media
    .filter((item) => item.kind !== "VIDEO")
    .map((item) => ({ url: item.url, alt: item.altText ?? "" }));

  return {
    type: video ? "video" : images.length > 1 ? "collage" : "image",
    images: video && images.length === 0 && video.posterUrl ? [{ url: video.posterUrl, alt: "" }] : images,
    video_url: video?.url ?? null,
    // These are real uploads, not the prototype's sample clip.
    use_sample_video: false,
    ...contextOf(post),
  };
}

function contextOf(post: ApiPost) {
  return {
    ...(post.place
      ? { location: { label: post.place.name, lat: post.place.lat ?? undefined, lng: post.place.lng ?? undefined } }
      : {}),
    ...(post.feelingLabel
      ? { feeling: { kind: "feeling" as const, emoji: post.feelingIcon ?? "🙂", label: post.feelingLabel } }
      : {}),
    ...(post.taggedPeople.length > 0
      ? {
          tagged: post.taggedPeople.map((person) => ({
            name: person.name,
            handle: person.handle ? `@${person.handle}` : "@user",
            slug: person.handle,
          })),
        }
      : {}),
  };
}

function toFeedItem(post: ApiPost): FeedItem {
  return {
    id: post.id,
    // The API has no categories; the prototype's filter chips are fixture-era.
    category: "general",
    author: toAuthor(post.author),
    text: post.text ?? "",
    tags: [],
    media: toMedia(post),
    audio: null,
    engagement: {
      likes: post.counts.likes,
      comments: post.counts.comments,
      shares: post.counts.shares,
    },
    relationship: {
      following: post.viewer.followingAuthor,
      subscribed: post.visibility === "SUBSCRIBERS" && !post.locked ? true : undefined,
    },
    posted_at: post.postedAt,
    posted_ago: postedAgo(post.postedAt),
    // Without these the card resets to unliked on every reload, which during
    // testing looks exactly like a like that did not save.
    viewer_liked: post.viewer.liked,
    viewer_bookmarked: post.viewer.bookmarked,
    // The lock the card renders. `locked` is the viewer's own answer; the
    // visibility alone would put a lock on the author's own post.
    members_only: post.locked || undefined,
    is_own: post.viewer.isAuthor,
  };
}

// ── Reads ───────────────────────────────────────────────────────────────────

export async function liveFeedData(): Promise<FeedData> {
  const empty: FeedData = {
    version: "1.0",
    description: "INRCLIQ feed (live backend)",
    generated_at: new Date().toISOString(),
    total_items: 0,
    categories: [],
    items: [],
  };

  const current = await getBackendUser();
  if (!current) return empty;

  const result = await callBackend<ApiPage>(`/feed?limit=${FEED_PAGE}`, {
    token: current.session.accessToken,
  });

  // A feed that cannot load renders as empty rather than throwing the page away
  // — the rest of the shell is still useful, and the alternative is a crash.
  if (!result.ok) return empty;

  const items = result.data.items.map(toFeedItem);
  return { ...empty, total_items: items.length, items };
}

/** One profile's own grid, for a public profile page. */
export async function liveProfileFeed(profileId: string): Promise<FeedItem[]> {
  const current = await getBackendUser();
  if (!current) return [];

  const result = await callBackend<ApiPage>(`/profiles/${profileId}/posts?limit=${FEED_PAGE}`, {
    token: current.session.accessToken,
  });

  return result.ok ? result.data.items.map(toFeedItem) : [];
}

// ── Writes ──────────────────────────────────────────────────────────────────

/**
 * POST /api/feed/uploads — post media, relayed to Azure.
 *
 * Same three steps as the avatar upload: ask the API for a write URL, PUT the
 * bytes to Azure, hand back the public URL. The `attachmentId` rides along
 * because the composer has to send it when it publishes — the API takes an
 * attachment it can check the owner and purpose of, not a URL it would have to
 * trust.
 */
export async function liveUploadPostMedia(request: Request) {
  const current = await getBackendUser();
  if (!current) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const token = current.session.accessToken;
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const isVideo = file.type.startsWith("video/");
  if (!isVideo && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Choose an image or a video." }, { status: 400 });
  }

  // Limits from GET /enums, which reads the same table the API refuses on. The
  // copy this route used to carry was wrong in both directions: it capped video
  // at 25 MB where the API takes 500, and allowed video/webm which the API does
  // not — so it rejected files the server wanted and accepted files it refused.
  const purpose = isVideo ? UPLOAD_PURPOSE.POST_VIDEO : UPLOAD_PURPOSE.POST_IMAGE;
  const rules = await uploadRules(purpose);
  const problem = checkFile(file, rules);
  if (problem) {
    return NextResponse.json({ error: problem }, { status: 400 });
  }

  const grant = await callBackend<{ attachmentId: string; uploadUrl: string }>("/media/upload-url", {
    method: "POST",
    token,
    body: { purpose, mimeType: file.type, sizeBytes: file.size },
  });

  if (!grant.ok) {
    return NextResponse.json({ error: errorCopy(grant.errorCode, grant.message) }, { status: grant.status });
  }

  let uploaded: Response;
  try {
    uploaded = await fetch(grant.data.uploadUrl, {
      method: "PUT",
      // Azure refuses a blob PUT without the first, and the second is signed
      // into the SAS, so a different value fails the signature.
      headers: { "x-ms-blob-type": "BlockBlob", "Content-Type": file.type },
      body: await file.arrayBuffer(),
    });
  } catch {
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 502 });
  }

  if (!uploaded.ok) {
    console.error(`post media upload failed: ${uploaded.status} ${await uploaded.text()}`);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 502 });
  }

  // The public URL is the SAS URL without its query string — the blob is
  // readable without a signature, which is what lets the feed render it.
  const url = grant.data.uploadUrl.split("?")[0]!;

  return NextResponse.json({
    ok: true,
    url,
    kind: isVideo ? "video" : "image",
    attachmentId: grant.data.attachmentId,
  });
}

interface ComposerPayload {
  text?: string;
  images?: { url?: string; alt?: string; attachmentId?: string }[];
  videoUrl?: string | null;
  videoAttachmentId?: string | null;
  gifUrl?: string | null;
  gifAlt?: string | null;
  feeling?: { emoji?: string; label?: string } | null;
  location?: { label?: string; lat?: number; lng?: number } | null;
  tagged?: { id?: string; handle?: string }[];
  membersOnly?: boolean;
}

/** POST /api/feed/posts — publish. */
export async function liveCreatePost(request: Request) {
  const current = await getBackendUser();
  if (!current) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const payload = (await request.json().catch(() => ({}))) as ComposerPayload;

  const media: Record<string, unknown>[] = [];

  for (const image of payload.images ?? []) {
    // Only an uploaded image can be posted: the API validates the attachment's
    // owner and purpose, which a bare URL would not let it do.
    if (image.attachmentId) {
      media.push({ kind: "IMAGE", attachmentId: image.attachmentId, altText: image.alt || undefined });
    }
  }

  if (payload.videoAttachmentId) {
    media.push({ kind: "VIDEO", attachmentId: payload.videoAttachmentId });
  }

  if (payload.gifUrl) {
    media.push({ kind: "GIF", externalUrl: payload.gifUrl, altText: payload.gifAlt || undefined });
  }

  // The picker now carries the profile id, so most tags need no lookup at all.
  // Handles are still resolved as a fallback, for a tag that came from somewhere
  // else — a draft saved before this change, or the mock's fixture people.
  //
  // Anyone who resolves to nothing is dropped rather than failing the publish.
  // Worth knowing when a tag goes missing: the post still publishes and still
  // reports success, it just publishes untagged.
  const picked = payload.tagged ?? [];
  const directIds = picked.map((person) => person.id).filter((id): id is string => isUuid(id));
  const unresolved = picked
    .filter((person) => !isUuid(person.id))
    .map((person) => person.handle)
    .filter((handle): handle is string => Boolean(handle));

  const taggedProfileIds = [
    ...new Set([...directIds, ...(await resolveHandles(unresolved, current.session.accessToken))]),
  ];

  const result = await callBackend<{ id: string; author: { handle: string | null } }>("/posts", {
    method: "POST",
    token: current.session.accessToken,
    body: {
      ...(payload.text ? { text: payload.text } : {}),
      ...(media.length > 0 ? { media } : {}),
      ...(payload.feeling?.label
        ? { feelingLabel: payload.feeling.label, feelingIcon: payload.feeling.emoji }
        : {}),
      ...(payload.location?.label
        ? {
            place: {
              name: payload.location.label,
              ...(payload.location.lat !== undefined ? { lat: payload.location.lat } : {}),
              ...(payload.location.lng !== undefined ? { lng: payload.location.lng } : {}),
            },
          }
        : {}),
      ...(taggedProfileIds.length > 0 ? { taggedProfileIds } : {}),
      ...(payload.membersOnly ? { visibility: "SUBSCRIBERS" } : {}),
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: errorCopy(result.errorCode, result.message) }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    postId: result.data.id,
    profileHref: result.data.author?.handle ? `/feed/profile/${result.data.author.handle}` : null,
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The mock's picker uses non-uuid ids, so this is what tells the two apart. */
function isUuid(value: string | undefined): value is string {
  return Boolean(value && UUID.test(value));
}

/** Handles → profile ids, dropping any the API does not know. */
async function resolveHandles(handles: string[], token: string): Promise<string[]> {
  const unique = [...new Set(handles.map((h) => h.trim().replace(/^@/, "")).filter(Boolean))];
  if (unique.length === 0) return [];

  const found = await Promise.all(
    unique.map(async (handle) => {
      const result = await callBackend<{ profileId?: string; id?: string }>(
        `/profiles/handle/${encodeURIComponent(handle)}`,
        { token },
      );
      return result.ok ? (result.data.profileId ?? result.data.id ?? null) : null;
    }),
  );

  return found.filter((id): id is string => Boolean(id));
}

/** DELETE /api/feed/posts — remove your own. */
export async function liveDeletePost(request: Request) {
  const current = await getBackendUser();
  if (!current) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const { postId } = (await request.json().catch(() => ({}))) as { postId?: string };
  if (!postId) return NextResponse.json({ error: "Post id is required." }, { status: 400 });

  const result = await callBackend(`/posts/${postId}`, {
    method: "DELETE",
    token: current.session.accessToken,
  });

  if (!result.ok) {
    return NextResponse.json({ error: errorCopy(result.errorCode, result.message) }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}

/**
 * PATCH /api/feed/posts — "hide this from my feed".
 *
 * There is no such endpoint yet: hiding is a per-viewer mute, which the API
 * does not model. Answering ok keeps the menu item working as a local dismissal
 * rather than showing the user an error for something that did nothing anyway.
 */
export function liveHidePost() {
  return NextResponse.json({ ok: true, hidden: false, reason: "not-supported-live" });
}

/** PUT/DELETE a bookmark, for the feed card's save button. */
export async function liveSetBookmark(postId: string, saved: boolean) {
  const current = await getBackendUser();
  if (!current) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const result = await callBackend<{ bookmarked: boolean; bookmarkCount: number }>(
    `/posts/${postId}/bookmark`,
    { method: saved ? "PUT" : "DELETE", token: current.session.accessToken },
  );

  if (!result.ok) {
    return NextResponse.json({ error: errorCopy(result.errorCode, result.message) }, { status: result.status });
  }

  return NextResponse.json({ ok: true, ...result.data });
}

/** PUT/DELETE a like, for the feed card's heart. */
export async function liveSetLike(postId: string, liked: boolean) {
  const current = await getBackendUser();
  if (!current) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const result = await callBackend<{ liked: boolean; likeCount: number }>(`/posts/${postId}/like`, {
    method: liked ? "PUT" : "DELETE",
    token: current.session.accessToken,
  });

  if (!result.ok) {
    return NextResponse.json({ error: errorCopy(result.errorCode, result.message) }, { status: result.status });
  }

  return NextResponse.json({ ok: true, ...result.data });
}

import { NextResponse } from "next/server";
import { callBackend } from "./client";
import { errorCopy } from "./mappers";
import { getBackendUser } from "./session";

/**
 * Comments, from the API instead of the fixture pool.
 *
 * The modal renders a flat list with one level of nested replies, which is
 * exactly what the API models — so the mapping is shallow. The one thing worth
 * doing here rather than in the component: replies are a separate request per
 * thread, and fetching them for every comment on open would be an N+1 on a busy
 * post. Only comments that actually have replies are expanded.
 */

interface ApiAuthor {
  profileId: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  verified: boolean;
}

interface ApiComment {
  id: string;
  author: ApiAuthor;
  body: string;
  parentCommentId: string | null;
  replyCount: number;
  createdAt: string;
  editedAt: string | null;
  canDelete: boolean;
}

/** The shape the modal already renders. */
export interface UiComment {
  id: string;
  author: string;
  initials: string;
  color: string;
  text: string;
  timeAgo: string;
  likes: number;
  canDelete: boolean;
  replies?: UiComment[];
}

const PALETTE = ["#5b8def", "#e07a5f", "#3fa796", "#b36ae2", "#e8a33d", "#4bb3a1"];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0] ?? "").join("").toUpperCase() || "??";
}

/** Stable per profile, so a face does not change colour between renders. */
function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length]!;
}

function ago(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

function toUi(c: ApiComment): UiComment {
  return {
    id: c.id,
    author: c.author.name,
    initials: initialsOf(c.author.name),
    color: colorFor(c.author.profileId),
    text: c.body,
    timeAgo: ago(c.createdAt),
    // Per-comment likes have no endpoint yet, so this is honestly zero rather
    // than an invented number.
    likes: 0,
    canDelete: c.canDelete,
  };
}

export async function liveListComments(postId: string) {
  const current = await getBackendUser();
  if (!current) return NextResponse.json({ live: true, items: [] });

  const token = current.session.accessToken;
  const top = await callBackend<{ items: ApiComment[]; nextCursor: string | null }>(
    `/posts/${postId}/comments?limit=30`,
    { token },
  );

  if (!top.ok) {
    return NextResponse.json({ live: true, items: [], error: errorCopy(top.errorCode, top.message) });
  }

  const items = await Promise.all(
    top.data.items.map(async (comment) => {
      const ui = toUi(comment);
      if (comment.replyCount === 0) return ui;

      const replies = await callBackend<{ items: ApiComment[] }>(
        `/posts/${postId}/comments/${comment.id}/replies?limit=20`,
        { token },
      );
      return { ...ui, replies: replies.ok ? replies.data.items.map(toUi) : [] };
    }),
  );

  return NextResponse.json({ live: true, items });
}

export async function liveAddComment(postId: string, request: Request) {
  const current = await getBackendUser();
  if (!current) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const { body, parentCommentId } = (await request.json().catch(() => ({}))) as {
    body?: string;
    parentCommentId?: string;
  };

  if (!body?.trim()) return NextResponse.json({ error: "Write something first." }, { status: 400 });

  const result = await callBackend<ApiComment>(`/posts/${postId}/comments`, {
    method: "POST",
    token: current.session.accessToken,
    body: { body: body.trim(), ...(parentCommentId ? { parentCommentId } : {}) },
  });

  if (!result.ok) {
    return NextResponse.json({ error: errorCopy(result.errorCode, result.message) }, { status: result.status });
  }

  return NextResponse.json({ ok: true, comment: toUi(result.data) });
}

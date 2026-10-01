import { NextResponse } from "next/server";
import { callBackend } from "./client";
import { getBackendUser } from "./session";

/**
 * The people offered by TAG PEOPLE in the composer.
 *
 * There is no people-search endpoint on the API, so this is not a search. It is
 * the list of profiles you follow, fetched once when the panel opens and then
 * filtered in memory as you type — which is what Instagram's tag sheet does, and
 * it is a better default than a search box anyway: the people you are with are
 * overwhelmingly people you already follow.
 *
 * The consequence to know about: you cannot tag someone you do not follow. That
 * needs `GET /profiles/search?q=`, which does not exist yet. Until it does, this
 * is the honest ceiling rather than a dropdown that silently finds nobody.
 */

// The API caps this at 50 and refuses more with a 400 — asking for 100 returned
// nothing at all, and because a failure here reads as "no matches" it looked
// like an empty follow list rather than a rejected request.
const FOLLOWING_PAGE = 50;
const MAX_RESULTS = 8;

/** Matches the mock route's shape so the composer does not care which mode it is in. */
export type PeopleSearchResult = {
  id: string;
  name: string;
  handle: string;
  slug: string | null;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl: string | null;
};

type FollowRow = {
  profileId: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  verified: boolean;
};

const AVATAR_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444"];

/** Stable per person, so a face does not change colour between renders. */
function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

/** GET /api/feed/people?q= — live mode. */
export async function livePeopleSearch(query: string) {
  const current = await getBackendUser();
  if (!current) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const token = current.session.accessToken;

  const me = await callBackend<{ profileId: string }>("/users/me/profile", { token });
  if (!me.ok) {
    // Logged rather than swallowed: an empty dropdown is indistinguishable from
    // "you follow nobody", so a failure that says nothing is a failure nobody
    // finds.
    console.error("[people] /users/me/profile failed", me.status, me.errorCode, me.message);
    return NextResponse.json({ results: [] as PeopleSearchResult[] });
  }

  const following = await callBackend<{ items: FollowRow[] }>(
    `/profiles/${me.data.profileId}/following?limit=${FOLLOWING_PAGE}`,
    { token },
  );
  if (!following.ok) {
    console.error("[people] following lookup failed", following.status, following.errorCode, following.message);
    return NextResponse.json({ results: [] as PeopleSearchResult[] });
  }

  const needle = query.trim().replace(/^@/, "").toLowerCase();

  const results = (following.data.items ?? [])
    .filter((row) => {
      // An empty query lists everyone: the panel opens with people in it rather
      // than an empty box that gives no hint there is anything to find.
      if (!needle) return true;
      return (
        row.name.toLowerCase().includes(needle) || (row.handle ?? "").toLowerCase().includes(needle)
      );
    })
    .slice(0, MAX_RESULTS)
    .map<PeopleSearchResult>((row) => ({
      // The profile id, not the user id — this is what `taggedProfileIds` takes,
      // so carrying it here means publishing needs no second lookup.
      id: row.profileId,
      name: row.name,
      handle: row.handle ? `@${row.handle}` : "",
      slug: row.handle,
      avatarInitials: initialsFor(row.name),
      avatarColor: colorFor(row.profileId),
      avatarUrl: row.avatarUrl,
    }));

  return NextResponse.json({ results });
}

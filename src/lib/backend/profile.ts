import { NextResponse } from "next/server";
import { AccountType } from "@/generated/prisma/client";
import { callBackend } from "./client";
import { errorCopy, splitName } from "./mappers";
import { getBackendUser } from "./session";
import { getCountryLabel } from "@/lib/constants/locations";
import type { ProtectionTier } from "@/lib/guardian/constants";
import type { AccountProfile, AccountSocialPerson } from "@/lib/feed/account-profile";

/**
 * The profile screens, served from the API instead of the local database.
 *
 * `getAccountProfile()` builds its view by reading eight tables directly. None
 * of them exist behind the API, so this assembles the same `AccountProfile` from
 * three calls and leaves the components untouched:
 *
 *   GET /users/me              the account — email, date of birth, location
 *   GET /users/me/profile      the header — name, handle, pictures, counts
 *   GET /profiles/{id}/…       the three social tabs
 *
 * The split is deliberate on the API's side: `/users/me` answers "who is this
 * account", `/users/me/profile` answers "what does the profile header render".
 * Both are needed here because the screen shows both.
 */

/** What GET /users/me returns, beyond the fields a session already needs. */
interface AccountResponse {
  userId: string;
  username: string;
  name: string;
  email: string;
  emailVerified: boolean;
  dateOfBirth: string | null;
  age: number | null;
  country: string | null;
  region: string | null;
  memberSince: string;
  accountType: AccountType;
  isCreator: boolean;
}

interface PrivacyTierResponse {
  code: string | null;
  label: string;
  description: string;
}

/** What GET /users/me/profile returns. */
interface ProfileResponse {
  userId: string;
  profileId: string;
  name: string;
  handle: string | null;
  bio: string | null;
  accountType: AccountType;
  privacyTier: PrivacyTierResponse;
  profilePictureUrl: string | null;
  coverPictureUrl: string | null;
  counts: { followers: number; following: number; subscriptions: number };
  creatorBadgeStatus: string;
}

interface SocialRow {
  profileId: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  verified: boolean;
  /** Subscriptions only. */
  status?: string;
  notifyLevel?: string;
}

interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** The first page of each tab. The tabs paginate by page number from there. */
const TAB_LIMIT = 20;

function accountTypeLabel(type: AccountType): string {
  if (type === AccountType.MINOR) return "Minor";
  if (type === AccountType.GUARDIAN) return "Guardian";
  return "Adult";
}

/** "1994-01-15" → "January 15, 1994", the form the profile screen prints. */
function longDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** "2026-09-26T19:14:49Z" → "September 2026". */
function monthAndYear(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const joined = parts.map((part) => part[0] ?? "").join("").toUpperCase();
  return joined || "ME";
}

/** The sub-line under a subscription row, from the two fields it carries. */
function notifyLabel(row: SocialRow): string {
  if (row.notifyLevel === "ALL") return "All notifications";
  if (row.notifyLevel === "NONE") return "Notifications off";
  if (row.notifyLevel === "PERSONALIZED") return "Personalized";
  return "Subscribed";
}

function toPerson(row: SocialRow, meta: string): AccountSocialPerson {
  const name = row.name?.trim() || "Member";
  return {
    id: row.profileId,
    name,
    // The API stores the handle bare; every screen prints it with the @.
    handle: row.handle ? `@${row.handle}` : "@user",
    // A profile is addressed by its handle, which is what the public route
    // resolves. There is no slug any more, so nothing to carry here.
    slug: row.handle,
    href: row.handle ? `/feed/profile/${row.handle}` : null,
    avatarInitials: initialsOf(name),
    avatarColor: "#6b9fff",
    avatarUrl: row.avatarUrl,
    verified: row.verified,
    meta,
  };
}

async function socialTab(
  token: string,
  profileId: string,
  tab: "followers" | "following" | "subscriptions",
): Promise<SocialRow[]> {
  const result = await callBackend<Page<SocialRow>>(
    `/profiles/${profileId}/${tab}?page=1&limit=${TAB_LIMIT}`,
    { token },
  );
  // One empty tab must not blank the whole screen — a profile still renders
  // without its lists, and the counts come from the header call regardless.
  return result.ok ? result.data.items ?? [] : [];
}

export async function liveAccountProfile(): Promise<AccountProfile | null> {
  const current = await getBackendUser();
  if (!current) return null;

  const token = current.session.accessToken;

  const [account, profile] = await Promise.all([
    callBackend<AccountResponse>("/users/me", { token }),
    callBackend<ProfileResponse>("/users/me/profile", { token }),
  ]);

  if (!account.ok || !profile.ok) return null;

  const me = account.data;
  const header = profile.data;

  const [followers, following, subscriptions] = await Promise.all([
    socialTab(token, header.profileId, "followers"),
    socialTab(token, header.profileId, "following"),
    socialTab(token, header.profileId, "subscriptions"),
  ]);

  const fullName = header.name?.trim() || me.name?.trim() || me.email;
  const { firstName, lastName } = splitName(fullName);
  const countryLabel = me.country ? getCountryLabel(me.country) : null;
  const region = me.region?.trim() || null;

  // The API already resolves the tier's label and description — for a minor
  // that copy depends on what the guardian approved, so deriving it a second
  // time here is how the two screens end up disagreeing.
  const tier = header.privacyTier;

  return {
    id: me.userId,
    firstName: firstName || null,
    lastName: lastName || null,
    fullName,
    // Null is the whole "No handle set · Set now" signal, and must survive.
    handle: header.handle,
    email: me.email,
    emailVerified: me.emailVerified,
    accountType: header.accountType,
    accountTypeLabel: accountTypeLabel(header.accountType),
    dateOfBirth: longDate(me.dateOfBirth),
    age: me.age,
    country: me.country,
    countryLabel,
    region,
    locationLabel: [region, countryLabel].filter(Boolean).join(", ") || null,
    privacyTier: (tier.code as ProtectionTier | null) ?? null,
    privacyTierLabel: tier.label,
    privacyTierDescription: tier.description,
    memberSince: monthAndYear(me.memberSince),
    avatarInitial: initialsOf(fullName).charAt(0),
    avatarUrl: header.profilePictureUrl,
    avatarColor: null,
    // The monetized badge, not email verification.
    verified: header.creatorBadgeStatus === "VERIFIED",
    // Posts live behind the feed API, which is not built yet. The counter reads
    // zero rather than guessing, and the header renders the same either way.
    postCount: 0,
    profileHref: header.handle ? `/feed/profile/${header.handle}` : null,
    // A minor's guardian summary has no endpoint yet. Null renders the screen
    // without that card, which is correct until one exists.
    guardian: null,
    social: {
      followersCount: header.counts.followers,
      followingCount: header.counts.following,
      subscriptionsCount: header.counts.subscriptions,
      followers: followers.map((row) => toPerson(row, "Follower")),
      following: following.map((row) => toPerson(row, "Following")),
      subscriptions: subscriptions.map((row) => toPerson(row, notifyLabel(row))),
    },
  };
}

// ── Mutations ───────────────────────────────────────────────────────────────

/**
 * POST /api/feed/me/avatar — the profile photo, uploaded to Azure.
 *
 * The browser posts a file to this route exactly as it does in mock mode; what
 * changes is where the bytes go. Blob storage takes three steps:
 *
 *   1. ask the API for a write URL      POST /media/upload-url
 *   2. PUT the bytes straight to Azure  (the SAS URL, BlockBlob)
 *   3. apply the attachment             PATCH /users/me/profile-picture
 *
 * Step 2 runs here rather than in the browser on purpose. The SAS is a bearer
 * credential for one blob, and handing it to the page would put it in the
 * network log of every client that uploads.
 */
export async function liveSetAvatar(request: Request) {
  const current = await getBackendUser();
  if (!current) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const token = current.session.accessToken;

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image file provided." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Choose an image file (JPG, PNG, WebP, or GIF)." }, { status: 400 });
  }
  if (file.size <= 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  }

  // The API holds the per-purpose size and type limits, so let it refuse rather
  // than keeping a second copy of the rules here that can drift out of step.
  const grant = await callBackend<{ attachmentId: string; uploadUrl: string; key: string }>(
    "/media/upload-url",
    { method: "POST", token, body: { purpose: "PROFILE_PIC", mimeType: file.type, sizeBytes: file.size } },
  );

  if (!grant.ok) {
    return NextResponse.json(
      { error: errorCopy(grant.errorCode, grant.message) },
      { status: grant.status },
    );
  }

  let uploaded: Response;
  try {
    uploaded = await fetch(grant.data.uploadUrl, {
      method: "PUT",
      headers: {
        // Azure rejects a blob PUT without this, and the content type is signed
        // into the SAS — sending a different one fails the signature.
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": file.type,
      },
      body: await file.arrayBuffer(),
    });
  } catch {
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 502 });
  }

  if (!uploaded.ok) {
    // The attachment row exists but has no blob behind it. Saying so beats
    // applying it and serving a broken image from the profile header.
    console.error(`avatar upload to blob storage failed: ${uploaded.status} ${await uploaded.text()}`);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 502 });
  }

  const applied = await callBackend<{ profilePictureUrl: string }>("/users/me/profile-picture", {
    method: "PATCH",
    token,
    body: { attachmentId: grant.data.attachmentId },
  });

  if (!applied.ok) {
    return NextResponse.json(
      { error: errorCopy(applied.errorCode, applied.message) },
      { status: applied.status },
    );
  }

  // The component reads `avatarUrl`; the API calls it profilePictureUrl.
  return NextResponse.json({ ok: true, avatarUrl: applied.data.profilePictureUrl });
}

/** POST /api/feed/me/handle — the "Set now" modal on the profile header. */
export async function liveSetHandle(request: Request) {
  const current = await getBackendUser();
  if (!current) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const body = (await request.json()) as { handle?: unknown };
  const handle = typeof body.handle === "string" ? body.handle.trim().replace(/^@/, "") : "";

  if (!handle) {
    return NextResponse.json({ error: "Enter a handle." }, { status: 400 });
  }

  const result = await callBackend<{ handle: string }>("/users/me/handle", {
    method: "PATCH",
    token: current.session.accessToken,
    body: { handle },
  });

  if (!result.ok) {
    // 409 is the one the modal renders inline as "already taken"; everything
    // else is a validation message against the field.
    return NextResponse.json(
      { error: errorCopy(result.errorCode, result.message) },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true, handle: result.data.handle });
}

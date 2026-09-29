import { callBackend } from "./client";

/**
 * The API's enum catalogue, fetched once and cached.
 *
 * The point is not to learn that `"PROFILE_PIC"` spells `"PROFILE_PIC"` — a
 * network round trip for that would be silly. It is the rules attached to each
 * value. Both upload routes carried their own copy of the limits, and all four
 * of them were wrong:
 *
 *   avatar      8 MB and image/gif allowed   → the API takes 5 MB and no gif
 *   post video  25 MB and video/webm allowed → the API takes 500 MB and no webm
 *
 * So a 6 MB avatar passed the client check and was refused by the API with a
 * message the user could not act on, and a 30 MB video was rejected here even
 * though the API would have taken it. Reading the limits from the source that
 * enforces them is the only way those two cannot disagree.
 */

export interface EnumValue {
  value: string;
  label: string;
  description?: string;
  meta?: Record<string, unknown>;
}

export interface EnumDefinition {
  description: string;
  default?: string;
  readOnly?: boolean;
  values: EnumValue[];
}

export interface EnumCatalog {
  version: string;
  generatedAt: string;
  groups: Record<string, { label: string; description: string; enums: Record<string, EnumDefinition> }>;
}

/** The purposes this app uploads for. Typed so a caller cannot invent one. */
export const UPLOAD_PURPOSE = {
  PROFILE_PIC: "PROFILE_PIC",
  COVER_PIC: "COVER_PIC",
  POST_IMAGE: "POST_IMAGE",
  POST_VIDEO: "POST_VIDEO",
} as const;

export type UploadPurpose = (typeof UPLOAD_PURPOSE)[keyof typeof UPLOAD_PURPOSE];

export interface UploadRules {
  mimeTypes: string[];
  maxBytes: number;
  /** False for identity documents, which need a signed URL to read back. */
  publiclyReadable: boolean;
  /** Whether these came from the API or the built-in fallback. */
  source: "api" | "fallback";
}

/**
 * What to allow when the catalogue cannot be reached.
 *
 * Deliberately the *API's* current numbers rather than the prototype's old
 * ones, so a fallback is a stale copy of the truth instead of a second opinion.
 * An upload must not break because a metadata endpoint blipped, but it also
 * must not quietly widen what the server will accept.
 */
const FALLBACK: Record<UploadPurpose, Omit<UploadRules, "source">> = {
  PROFILE_PIC: { mimeTypes: ["image/jpeg", "image/png", "image/webp"], maxBytes: 5 * 1024 * 1024, publiclyReadable: true },
  COVER_PIC: { mimeTypes: ["image/jpeg", "image/png", "image/webp"], maxBytes: 10 * 1024 * 1024, publiclyReadable: true },
  POST_IMAGE: {
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxBytes: 10 * 1024 * 1024,
    publiclyReadable: true,
  },
  POST_VIDEO: { mimeTypes: ["video/mp4", "video/quicktime"], maxBytes: 500 * 1024 * 1024, publiclyReadable: true },
};

/** Matches the endpoint's own `max-age`, so we are never staler than it asks. */
const TTL_MS = 5 * 60 * 1000;

let cache: { catalog: EnumCatalog; fetchedAt: number } | null = null;
let inFlight: Promise<EnumCatalog | null> | null = null;

/**
 * The catalogue, or null when it cannot be reached.
 *
 * Concurrent callers share one request: on a cold start a page rendering four
 * components would otherwise fire four identical fetches.
 */
export async function loadEnums(): Promise<EnumCatalog | null> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) return cache.catalog;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const result = await callBackend<EnumCatalog>("/enums");

    if (!result.ok) {
      // Keep serving a stale copy rather than falling back to constants — it is
      // closer to the truth than the built-in table.
      console.warn(`enum catalogue unavailable (${result.errorCode}); using ${cache ? "stale cache" : "fallback"}`);
      return cache?.catalog ?? null;
    }

    cache = { catalog: result.data, fetchedAt: Date.now() };
    return result.data;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/** The limits for one upload purpose, from the API where possible. */
export async function uploadRules(purpose: UploadPurpose): Promise<UploadRules> {
  const catalog = await loadEnums();
  const values = catalog?.groups?.media?.enums?.AttachmentPurpose?.values;
  const entry = values?.find((item) => item.value === purpose);
  const meta = entry?.meta;

  if (!meta || !Array.isArray(meta.mimeTypes) || typeof meta.maxBytes !== "number") {
    return { ...FALLBACK[purpose], source: "fallback" };
  }

  return {
    mimeTypes: meta.mimeTypes as string[],
    maxBytes: meta.maxBytes,
    publiclyReadable: meta.publiclyReadable !== false,
    source: "api",
  };
}

/**
 * Checks a file against the rules before an upload URL is requested.
 *
 * Returning the API's own wording where it can — "Choose a JPG, PNG or WebP" is
 * actionable in a way that "unsupported file type" is not, and it cannot drift
 * from what the server accepts because it is generated from the same list.
 */
export function checkFile(file: { type: string; size: number }, rules: UploadRules): string | null {
  if (file.size <= 0) return "That file is empty.";

  if (!rules.mimeTypes.includes(file.type)) {
    return `Choose ${describeTypes(rules.mimeTypes)}.`;
  }

  if (file.size > rules.maxBytes) {
    return `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(rules.maxBytes)}.`;
  }

  return null;
}

/** ["image/jpeg","image/png"] → "a JPG or PNG file" */
function describeTypes(mimeTypes: string[]): string {
  const names = [...new Set(mimeTypes.map(shortName))];
  if (names.length === 0) return "a supported file";
  if (names.length === 1) return `${article(names[0]!)} ${names[0]} file`;

  const last = names.pop()!;
  return `${article(names[0]!)} ${names.join(", ")} or ${last} file`;
}

/**
 * "an MP4", not "a MP4".
 *
 * Judged on how the initialism is *said* rather than spelled — M is "em", so it
 * takes "an" despite being a consonant.
 */
function article(name: string): string {
  return /^[AEFHILMNORSX]/.test(name) ? "an" : "a";
}

function shortName(mimeType: string): string {
  const subtype = mimeType.split("/")[1] ?? mimeType;
  if (subtype === "jpeg") return "JPG";
  if (subtype === "quicktime") return "MOV";
  if (subtype === "svg+xml") return "SVG";
  return subtype.toUpperCase();
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(bytes % (1024 * 1024) === 0 ? 0 : 1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * A human label for any enum value the API knows.
 *
 * Saves each screen keeping its own map of state → copy, which is how two
 * screens end up calling the same state different things.
 */
export async function enumLabel(group: string, enumName: string, value: string): Promise<string> {
  const catalog = await loadEnums();
  const match = catalog?.groups?.[group]?.enums?.[enumName]?.values?.find((item) => item.value === value);

  return match?.label ?? value;
}

/** Clears the cache. For tests, and for a manual refresh after a deploy. */
export function resetEnumCache(): void {
  cache = null;
  inFlight = null;
}

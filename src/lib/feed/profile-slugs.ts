const HANDLE_TO_SLUG: Record<string, string> = {
  "@miachenruns": "mia-chen",
  miachenruns: "mia-chen",
  "@devweekly": "dev-weekly",
  devweekly: "dev-weekly",
  "@hiran": "hiran",
  hiran: "hiran",
  "@planetunfolded": "planet-unfolded",
  planetunfolded: "planet-unfolded",
  "@goodguypod": "good-guy-podcast",
  goodguypod: "good-guy-podcast",
  "@bnsofficial": "bathiya-santhush",
  bnsofficial: "bathiya-santhush",
  "@billieeilish": "billie-eilish",
  billieeilish: "billie-eilish",
  "@hardfork": "hard-fork",
  hardfork: "hard-fork",
  "@jamesclear": "james-clear",
  jamesclear: "james-clear",
  "@taylorswift": "taylor-swift",
  taylorswift: "taylor-swift",
  "@inrcliq": "inrcliq-originals",
  inrcliq: "inrcliq-originals",
};

/** Known curated profile slugs (rich migrated profiles). */
export function getProfileSlugFromHandle(handle: string): string | null {
  const normalized = handle.startsWith("@") ? handle : `@${handle}`;
  return HANDLE_TO_SLUG[normalized] ?? HANDLE_TO_SLUG[handle.replace(/^@/, "")] ?? null;
}

/**
 * Resolve a browsable `/feed/profile/[slug]` for any feed author.
 * Prefers curated map, then author.slug from DB, then bare handle
 * (matches stub UserProfile / CreatorUser slugs).
 */
export function resolveAuthorProfileSlug(
  handle: string,
  authorSlug?: string | null,
): string {
  const curated = getProfileSlugFromHandle(handle);
  if (curated) return curated;

  const fromAuthor = authorSlug?.trim();
  if (fromAuthor) return fromAuthor;

  return handle.replace(/^@/, "").trim().toLowerCase();
}

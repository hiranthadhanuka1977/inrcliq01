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
};

export function getProfileSlugFromHandle(handle: string): string | null {
  const normalized = handle.startsWith("@") ? handle : `@${handle}`;
  return HANDLE_TO_SLUG[normalized] ?? HANDLE_TO_SLUG[handle.replace(/^@/, "")] ?? null;
}

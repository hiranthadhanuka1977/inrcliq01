export type FeedTheme = "light" | "dark";

export const FEED_THEME_STORAGE_KEY = "inrcliq-feed-theme";
export const FEED_THEME_ATTRIBUTE = "data-feed-theme";

/** Paths that participate in dark/light theming (auth + feed). */
export function isThemedPath(pathname: string): boolean {
  if (pathname === "/" || pathname.indexOf("/feed") === 0) return true;
  return (
    pathname.indexOf("/signup") === 0 ||
    pathname.indexOf("/onboarding") === 0 ||
    pathname.indexOf("/verify-email") === 0 ||
    pathname.indexOf("/forgot-login") === 0 ||
    pathname.indexOf("/guardian") === 0 ||
    pathname.indexOf("/settings/unlock") === 0
  );
}

/** Default when localStorage has no preference: light on auth, dark on feed. */
export function defaultThemeForPath(pathname: string): FeedTheme {
  return pathname.indexOf("/feed") === 0 ? "dark" : "light";
}

export function isFeedTheme(value: unknown): value is FeedTheme {
  return value === "light" || value === "dark";
}

export function readStoredFeedTheme(pathname?: string): FeedTheme {
  const path =
    pathname ??
    (typeof window !== "undefined" ? window.location.pathname || "/" : "/");
  const fallback = defaultThemeForPath(path);

  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(FEED_THEME_STORAGE_KEY);
    return isFeedTheme(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

export function applyFeedTheme(theme: FeedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute(FEED_THEME_ATTRIBUTE, theme);
}

export function persistFeedTheme(theme: FeedTheme) {
  applyFeedTheme(theme);
  try {
    window.localStorage.setItem(FEED_THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore private-mode / blocked storage.
  }
}

/**
 * Runs before paint on themed routes so the chosen theme applies
 * without a white/dark flash. Pair with suppressHydrationWarning on <html>.
 */
export const FEED_THEME_BOOTSTRAP = `(function(){try{var p=location.pathname||"/";var feed=p.indexOf("/feed")===0;var themed=feed||p==="/"||p.indexOf("/signup")===0||p.indexOf("/onboarding")===0||p.indexOf("/verify-email")===0||p.indexOf("/forgot-login")===0||p.indexOf("/guardian")===0||p.indexOf("/settings/unlock")===0;if(!themed)return;var t=feed?"dark":"light";try{var s=localStorage.getItem(${JSON.stringify(FEED_THEME_STORAGE_KEY)});if(s==="light"||s==="dark")t=s;}catch(e){}document.documentElement.setAttribute(${JSON.stringify(FEED_THEME_ATTRIBUTE)},t);}catch(e){}})();`;

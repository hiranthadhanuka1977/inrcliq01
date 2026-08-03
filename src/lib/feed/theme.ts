export type FeedTheme = "light" | "dark";

export const FEED_THEME_STORAGE_KEY = "inrcliq-feed-theme";
export const FEED_THEME_ATTRIBUTE = "data-feed-theme";

export function isFeedTheme(value: unknown): value is FeedTheme {
  return value === "light" || value === "dark";
}

export function readStoredFeedTheme(): FeedTheme {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem(FEED_THEME_STORAGE_KEY);
    return isFeedTheme(stored) ? stored : "dark";
  } catch {
    return "dark";
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
 * Runs before paint on /feed routes so the chosen theme applies
 * without a white/dark flash. Pair with suppressHydrationWarning on <html>.
 */
export const FEED_THEME_BOOTSTRAP = `(function(){try{var p=location.pathname||"";if(p.indexOf("/feed")!==0)return;var t="dark";try{var s=localStorage.getItem(${JSON.stringify(FEED_THEME_STORAGE_KEY)});if(s==="light"||s==="dark")t=s;}catch(e){}document.documentElement.setAttribute(${JSON.stringify(FEED_THEME_ATTRIBUTE)},t);}catch(e){}})();`;

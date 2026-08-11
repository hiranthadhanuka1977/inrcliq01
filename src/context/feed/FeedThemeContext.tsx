"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useServerInsertedHTML } from "next/navigation";
import {
  applyFeedTheme,
  FEED_THEME_BOOTSTRAP,
  persistFeedTheme,
  readStoredFeedTheme,
  type FeedTheme,
} from "@/lib/feed/theme";

type FeedThemeContextValue = {
  theme: FeedTheme;
  setTheme: (theme: FeedTheme) => void;
  toggleTheme: () => void;
};

const FeedThemeContext = createContext<FeedThemeContextValue | null>(null);

export function FeedThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<FeedTheme>("light");

  // Inject FOUC-prevention script into the SSR HTML stream outside the React
  // client tree (avoids the React 19 "script tag while rendering" warning).
  useServerInsertedHTML(() => (
    <script dangerouslySetInnerHTML={{ __html: FEED_THEME_BOOTSTRAP }} />
  ));

  useEffect(() => {
    const initial = readStoredFeedTheme();
    setThemeState(initial);
    applyFeedTheme(initial);
  }, []);

  const setTheme = useCallback((next: FeedTheme) => {
    setThemeState(next);
    persistFeedTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: FeedTheme = current === "dark" ? "light" : "dark";
      persistFeedTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  );

  return <FeedThemeContext.Provider value={value}>{children}</FeedThemeContext.Provider>;
}

export function useFeedTheme() {
  const context = useContext(FeedThemeContext);
  if (!context) {
    throw new Error("useFeedTheme must be used within FeedThemeProvider");
  }
  return context;
}

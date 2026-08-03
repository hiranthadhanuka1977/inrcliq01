"use client";

import { useFeedTheme } from "@/context/feed/FeedThemeContext";

export default function ThemeSwitcher({ className = "" }: { className?: string } = {}) {
  const { theme, toggleTheme } = useFeedTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={`theme-switcher${className ? ` ${className}` : ""}`}
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path
            strokeLinecap="round"
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5z"
          />
        </svg>
      )}
    </button>
  );
}

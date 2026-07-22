import type { CSSProperties } from "react";
import type { FeedAudioTheme } from "@/types/feed/feed";

export const DEFAULT_AUDIO_THEME: FeedAudioTheme = {
  accent_a: "120, 220, 160",
  accent_b: "72, 168, 118",
  base: ["#2a4534", "#223a2b", "#1a2e22"],
  border: "120, 200, 150",
};

export function getAudioThemeStyle(theme?: FeedAudioTheme): CSSProperties {
  const resolved = theme ?? DEFAULT_AUDIO_THEME;

  return {
    "--audio-accent-a": resolved.accent_a,
    "--audio-accent-b": resolved.accent_b,
    "--audio-base-1": resolved.base[0],
    "--audio-base-2": resolved.base[1],
    "--audio-base-3": resolved.base[2],
    "--audio-border": resolved.border,
  } as CSSProperties;
}

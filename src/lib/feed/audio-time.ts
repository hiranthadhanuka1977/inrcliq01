import type { FeedAudio } from "@/types/feed/feed";

export function parseTimecode(value: string): number {
  const parts = value.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

export function formatTimecode(totalSeconds: number): string {
  const rounded = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function getInitialSeconds(audio: FeedAudio, durationSeconds: number): number {
  if (typeof audio.progress === "number" && durationSeconds > 0) {
    return audio.progress * durationSeconds;
  }

  return parseTimecode(audio.current_time);
}

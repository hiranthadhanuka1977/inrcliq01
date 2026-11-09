"use client";

import { useSyncExternalStore } from "react";
import type { VideoShelfItem } from "@/lib/feed/video-shelf";

export type ShelfPlaylist = {
  id: string;
  name: string;
  keys: string[];
};

export type ShelfReport = {
  key: string;
  reason: string;
};

export type ShelfPrefs = {
  queue: string[];
  watchLater: string[];
  playlists: ShelfPlaylist[];
  hiddenKeys: string[];
  hiddenAuthors: string[];
  reports: ShelfReport[];
  cards: Record<string, VideoShelfItem>;
};

type ShelfToast = {
  message: string;
  undo?: () => void;
};

const STORAGE_KEY = "inrcliq.video-shelf-menu";
const EMPTY: ShelfPrefs = {
  queue: [],
  watchLater: [],
  playlists: [],
  hiddenKeys: [],
  hiddenAuthors: [],
  reports: [],
  cards: {},
};

let prefs: ShelfPrefs = EMPTY;
let loaded = false;
const prefListeners = new Set<() => void>();

let toast: ShelfToast | null = null;
let toastTimer = 0;
const toastListeners = new Set<() => void>();

let openMenuKey: string | null = null;
const menuListeners = new Set<(key: string | null) => void>();

function list(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readReports(value: unknown): ShelfReport[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Partial<ShelfReport>;
    if (typeof row.key !== "string" || typeof row.reason !== "string" || !row.reason.trim()) return [];
    return [{ key: row.key, reason: row.reason.trim().slice(0, 80) }];
  });
}

function readCards(value: unknown) {
  const cards: Record<string, VideoShelfItem> = {};
  if (!value || typeof value !== "object") return cards;
  for (const [key, card] of Object.entries(value as Record<string, unknown>)) {
    if (!card || typeof card !== "object") continue;
    const row = card as Partial<VideoShelfItem>;
    if (typeof row.key !== "string" || row.key !== key) continue;
    if (typeof row.href !== "string" || typeof row.title !== "string" || typeof row.authorName !== "string") continue;
    if (typeof row.postedAtMs !== "number") continue;
    cards[key] = row as VideoShelfItem;
  }
  return cards;
}

function listedIn(state: ShelfPrefs, key: string) {
  return state.queue.includes(key)
    || state.watchLater.includes(key)
    || state.playlists.some((playlist) => playlist.keys.includes(key));
}

function putCard(cards: Record<string, VideoShelfItem>, item: VideoShelfItem) {
  return { ...cards, [item.key]: item };
}

function dropCard(cards: Record<string, VideoShelfItem>, key: string) {
  if (!cards[key]) return cards;
  const next = { ...cards };
  delete next[key];
  return next;
}

function readPrefs(): ShelfPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<ShelfPrefs>;
    const playlists = Array.isArray(parsed.playlists)
      ? parsed.playlists.flatMap((playlist) => {
          if (!playlist || typeof playlist !== "object") return [];
          const row = playlist as Partial<ShelfPlaylist>;
          if (typeof row.id !== "string" || typeof row.name !== "string") return [];
          return [{ id: row.id, name: row.name, keys: list(row.keys) }];
        })
      : [];
    return {
      queue: list(parsed.queue),
      watchLater: list(parsed.watchLater),
      playlists,
      hiddenKeys: list(parsed.hiddenKeys),
      hiddenAuthors: list(parsed.hiddenAuthors),
      reports: readReports(parsed.reports),
      cards: readCards(parsed.cards),
    };
  } catch {
    return EMPTY;
  }
}

function ensurePrefs() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  prefs = readPrefs();
}

function emitPrefs() {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }
  prefListeners.forEach((listener) => listener());
}

function updatePrefs(next: ShelfPrefs) {
  ensurePrefs();
  prefs = next;
  emitPrefs();
}

function toggleKey(keys: string[], key: string) {
  return keys.includes(key) ? keys.filter((item) => item !== key) : [...keys, key];
}

export function authorShelfKey(item: { authorSlug: string | null; authorName: string }) {
  return item.authorSlug ? `slug:${item.authorSlug}` : `name:${item.authorName}`;
}

export function isShelfItemHidden(
  state: ShelfPrefs,
  item: { key: string; authorSlug: string | null; authorName: string },
) {
  return state.hiddenKeys.includes(item.key) || state.hiddenAuthors.includes(authorShelfKey(item));
}

export function useShelfPrefs() {
  return useSyncExternalStore(
    (listener) => {
      prefListeners.add(listener);
      return () => {
        prefListeners.delete(listener);
      };
    },
    () => {
      ensurePrefs();
      return prefs;
    },
    () => EMPTY,
  );
}

export function useShelfToast() {
  return useSyncExternalStore(
    (listener) => {
      toastListeners.add(listener);
      return () => {
        toastListeners.delete(listener);
      };
    },
    () => toast,
    () => null,
  );
}

export function showShelfToast(message: string, undo?: () => void) {
  toast = { message, undo };
  toastListeners.forEach((listener) => listener());
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast = null;
    toastListeners.forEach((listener) => listener());
  }, 5000);
}

export function dismissShelfToast() {
  toast = null;
  window.clearTimeout(toastTimer);
  toastListeners.forEach((listener) => listener());
}

export function claimShelfMenu(key: string) {
  openMenuKey = key;
  menuListeners.forEach((listener) => listener(key));
}

export function releaseShelfMenu(key: string) {
  if (openMenuKey !== key) return;
  openMenuKey = null;
  menuListeners.forEach((listener) => listener(null));
}

export function subscribeShelfMenu(listener: (key: string | null) => void) {
  menuListeners.add(listener);
  return () => {
    menuListeners.delete(listener);
  };
}

export function toggleShelfQueue(item: VideoShelfItem) {
  ensurePrefs();
  const saved = prefs.queue.includes(item.key);
  const queue = toggleKey(prefs.queue, item.key);
  const draft = { ...prefs, queue, cards: putCard(prefs.cards, item) };
  updatePrefs({ ...draft, cards: saved && !listedIn(draft, item.key) ? dropCard(draft.cards, item.key) : draft.cards });
  showShelfToast(saved ? "Removed from queue" : "Added to queue");
}

export function toggleWatchLater(item: VideoShelfItem) {
  ensurePrefs();
  const saved = prefs.watchLater.includes(item.key);
  const watchLater = toggleKey(prefs.watchLater, item.key);
  const draft = { ...prefs, watchLater, cards: putCard(prefs.cards, item) };
  updatePrefs({ ...draft, cards: saved && !listedIn(draft, item.key) ? dropCard(draft.cards, item.key) : draft.cards });
  showShelfToast(saved ? "Removed from Watch later" : "Saved to Watch later");
}

export function togglePlaylistVideo(playlistId: string, item: VideoShelfItem) {
  ensurePrefs();
  const playlist = prefs.playlists.find((entry) => entry.id === playlistId);
  if (!playlist) return;
  const saved = playlist.keys.includes(item.key);
  const playlists = prefs.playlists.map((entry) =>
    entry.id === playlistId ? { ...entry, keys: toggleKey(entry.keys, item.key) } : entry,
  );
  const draft = { ...prefs, playlists, cards: putCard(prefs.cards, item) };
  updatePrefs({ ...draft, cards: saved && !listedIn(draft, item.key) ? dropCard(draft.cards, item.key) : draft.cards });
  showShelfToast(saved ? `Removed from ${playlist.name}` : `Saved to ${playlist.name}`);
}

export function createShelfPlaylist(name: string, item: VideoShelfItem) {
  ensurePrefs();
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) return false;
  const playlist: ShelfPlaylist = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed,
    keys: [item.key],
  };
  updatePrefs({
    ...prefs,
    playlists: [...prefs.playlists, playlist],
    cards: putCard(prefs.cards, item),
  });
  showShelfToast(`Saved to ${trimmed}`);
  return true;
}

export function hideShelfVideo(key: string) {
  ensurePrefs();
  if (prefs.hiddenKeys.includes(key)) return;
  updatePrefs({ ...prefs, hiddenKeys: [...prefs.hiddenKeys, key] });
  showShelfToast("We'll show fewer videos like this", () => {
    updatePrefs({ ...prefs, hiddenKeys: prefs.hiddenKeys.filter((item) => item !== key) });
    dismissShelfToast();
  });
}

export function hideShelfAuthor(authorKey: string, authorName: string) {
  ensurePrefs();
  if (prefs.hiddenAuthors.includes(authorKey)) return;
  updatePrefs({ ...prefs, hiddenAuthors: [...prefs.hiddenAuthors, authorKey] });
  showShelfToast(`We'll show fewer videos from ${authorName}`, () => {
    updatePrefs({ ...prefs, hiddenAuthors: prefs.hiddenAuthors.filter((item) => item !== authorKey) });
    dismissShelfToast();
  });
}

export function restoreHiddenShelfItems() {
  ensurePrefs();
  if (!prefs.hiddenKeys.length && !prefs.hiddenAuthors.length) return;
  updatePrefs({ ...prefs, hiddenKeys: [], hiddenAuthors: [] });
}

export function reportShelfVideo(key: string, reason: string) {
  ensurePrefs();
  const clean = reason.trim().slice(0, 80);
  if (!clean) return;
  const alreadyHidden = prefs.hiddenKeys.includes(key);
  const reports = [...prefs.reports.filter((item) => item.key !== key), { key, reason: clean }];
  const hiddenKeys = alreadyHidden ? prefs.hiddenKeys : [...prefs.hiddenKeys, key];
  updatePrefs({ ...prefs, reports, hiddenKeys });
  showShelfToast(`Reported for ${clean}. This video is hidden.`, () => {
    updatePrefs({
      ...prefs,
      hiddenKeys: alreadyHidden ? prefs.hiddenKeys : prefs.hiddenKeys.filter((item) => item !== key),
      reports: prefs.reports.filter((item) => item.key !== key),
    });
    dismissShelfToast();
  });
}

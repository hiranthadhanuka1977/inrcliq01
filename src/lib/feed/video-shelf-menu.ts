"use client";

import { useSyncExternalStore } from "react";

export type ShelfPlaylist = {
  id: string;
  name: string;
  keys: string[];
};

export type ShelfPrefs = {
  queue: string[];
  watchLater: string[];
  playlists: ShelfPlaylist[];
  hiddenKeys: string[];
  hiddenAuthors: string[];
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

export function toggleShelfQueue(key: string) {
  ensurePrefs();
  const saved = prefs.queue.includes(key);
  updatePrefs({ ...prefs, queue: toggleKey(prefs.queue, key) });
  showShelfToast(saved ? "Removed from queue" : "Added to queue");
}

export function toggleWatchLater(key: string) {
  ensurePrefs();
  const saved = prefs.watchLater.includes(key);
  updatePrefs({ ...prefs, watchLater: toggleKey(prefs.watchLater, key) });
  showShelfToast(saved ? "Removed from Watch later" : "Saved to Watch later");
}

export function togglePlaylistVideo(playlistId: string, key: string) {
  ensurePrefs();
  const playlist = prefs.playlists.find((item) => item.id === playlistId);
  if (!playlist) return;
  const saved = playlist.keys.includes(key);
  updatePrefs({
    ...prefs,
    playlists: prefs.playlists.map((item) =>
      item.id === playlistId ? { ...item, keys: toggleKey(item.keys, key) } : item,
    ),
  });
  showShelfToast(saved ? `Removed from ${playlist.name}` : `Saved to ${playlist.name}`);
}

export function createShelfPlaylist(name: string, key: string) {
  ensurePrefs();
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) return false;
  const playlist: ShelfPlaylist = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed,
    keys: [key],
  };
  updatePrefs({ ...prefs, playlists: [...prefs.playlists, playlist] });
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

export function reportShelfVideo(key: string) {
  ensurePrefs();
  if (!prefs.hiddenKeys.includes(key)) {
    updatePrefs({ ...prefs, hiddenKeys: [...prefs.hiddenKeys, key] });
  }
  showShelfToast("Thanks for reporting. This video is hidden.", () => {
    updatePrefs({ ...prefs, hiddenKeys: prefs.hiddenKeys.filter((item) => item !== key) });
    dismissShelfToast();
  });
}

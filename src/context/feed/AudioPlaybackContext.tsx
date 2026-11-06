"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { FeedAudio } from "@/types/feed/feed";
import { formatTimecode, getInitialSeconds, parseTimecode } from "@/lib/feed/audio-time";

export type AudioFeedContentType = "podcast" | "audiobook" | "music" | "audio";

interface ActivateOptions {
  showName?: string;
  contentType?: AudioFeedContentType;
}

interface AudioPlaybackContextValue {
  activeItemId: string | null;
  audio: FeedAudio | null;
  showName: string | null;
  contentType: AudioFeedContentType;
  playing: boolean;
  currentSeconds: number;
  durationSeconds: number;
  progress: number;
  currentTimeLabel: string;
  durationLabel: string;
  showMiniPlayer: boolean;
  showFullscreenPlayer: boolean;
  liked: boolean;
  registerInlineElement: (itemId: string, element: HTMLElement | null) => void;
  ensureActive: (itemId: string, feedAudio: FeedAudio, options?: ActivateOptions) => void;
  activateAndToggle: (itemId: string, feedAudio: FeedAudio, options?: ActivateOptions) => void;
  togglePlay: () => void;
  close: () => void;
  skipBy: (deltaSeconds: number) => void;
  seekTo: (seconds: number) => void;
  toggleLike: () => void;
  openFullscreenPlayer: () => void;
  closeFullscreenPlayer: () => void;
}

const AudioPlaybackContext = createContext<AudioPlaybackContextValue | null>(null);

export function AudioPlaybackProvider({ children }: { children: ReactNode }) {
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [audio, setAudio] = useState<FeedAudio | null>(null);
  const [showName, setShowName] = useState<string | null>(null);
  const [contentType, setContentType] = useState<AudioFeedContentType>("audio");
  const [playing, setPlaying] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [inlineVisible, setInlineVisible] = useState(true);
  const [showFullscreenPlayer, setShowFullscreenPlayer] = useState(false);
  const [liked, setLiked] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedItemIdRef = useRef<string | null>(null);
  const fileRef = useRef<HTMLAudioElement | null>(null);
  const audioRef = useRef(audio);
  audioRef.current = audio;

  const durationSeconds = useMemo(
    () => (audio ? parseTimecode(audio.duration) : 0),
    [audio],
  );

  const progress = durationSeconds > 0 ? Math.min(currentSeconds / durationSeconds, 1) : 0;
  const currentTimeLabel = formatTimecode(currentSeconds);
  const durationLabel = formatTimecode(durationSeconds);
  const showMiniPlayer = Boolean(activeItemId && audio && hasStarted && !isDismissed);

  useEffect(() => {
    const url = audio?.audio_url;
    if (!url) {
      fileRef.current?.pause();
      fileRef.current = null;
      return;
    }
    const element = new Audio(url);
    fileRef.current = element;
    const start = audio.trim_start ?? 0;
    const place = () => {
      if (element.currentTime < start) element.currentTime = start;
    };
    const onTime = () => {
      const current = audioRef.current;
      const clipStart = current?.trim_start ?? 0;
      const clipEnd = current?.trim_end;
      if (clipEnd != null && element.currentTime >= clipEnd - 0.05) {
        element.pause();
        element.currentTime = clipStart;
        setPlaying(false);
        setCurrentSeconds(0);
        return;
      }
      setCurrentSeconds(Math.max(0, element.currentTime - clipStart));
    };
    element.addEventListener("loadedmetadata", place);
    element.addEventListener("timeupdate", onTime);
    return () => {
      element.pause();
      element.removeEventListener("loadedmetadata", place);
      element.removeEventListener("timeupdate", onTime);
      element.src = "";
      if (fileRef.current === element) fileRef.current = null;
    };
  }, [audio?.audio_url, audio?.trim_start, audio?.trim_end]);

  useEffect(() => {
    const element = fileRef.current;
    if (!element || !audio?.audio_url) return;
    if (playing) {
      void element.play().catch(() => setPlaying(false));
    } else {
      element.pause();
    }
  }, [playing, audio?.audio_url]);

  useEffect(() => {
    if (!playing || durationSeconds <= 0 || audio?.audio_url) {
      return;
    }

    const interval = window.setInterval(() => {
      setCurrentSeconds((prev) => {
        const next = prev + 0.1;
        return next >= durationSeconds ? durationSeconds : next;
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [playing, durationSeconds, audio?.audio_url]);

  useEffect(() => {
    if (currentSeconds >= durationSeconds && durationSeconds > 0 && playing) {
      setPlaying(false);
    }
  }, [currentSeconds, durationSeconds, playing]);

  const registerInlineElement = useCallback((itemId: string, element: HTMLElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
      observedItemIdRef.current = null;
    }

    if (!element) {
      if (activeItemId === itemId) {
        setInlineVisible(true);
      }
      return;
    }

    observedItemIdRef.current = itemId;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (observedItemIdRef.current !== itemId) {
          return;
        }

        setInlineVisible(entry.isIntersecting);
      },
      { threshold: 0.15, rootMargin: "-8px 0px -8px 0px" },
    );

    observer.observe(element);
    observerRef.current = observer;
  }, [activeItemId]);

  const activate = useCallback(
    (itemId: string, feedAudio: FeedAudio, options?: ActivateOptions) => {
      if (activeItemId !== itemId || audio?.title !== feedAudio.title) {
        const duration = parseTimecode(feedAudio.duration);
        setActiveItemId(itemId);
        setAudio(feedAudio);
        setCurrentSeconds(getInitialSeconds(feedAudio, duration));
        setLiked(false);
        setShowFullscreenPlayer(false);
      }
      if (options?.showName !== undefined) {
        setShowName(options.showName);
      }
      if (options?.contentType !== undefined) {
        setContentType(options.contentType);
      }
      setIsDismissed(false);
    },
    [activeItemId, audio?.title],
  );

  const activateAndToggle = useCallback(
    (itemId: string, feedAudio: FeedAudio, options?: ActivateOptions) => {
      const isSameItem = activeItemId === itemId;

      if (!isSameItem) {
        activate(itemId, feedAudio, options);
        setHasStarted(true);
        setPlaying(true);
        return;
      }

      if (options) {
        activate(itemId, feedAudio, options);
      }

      setPlaying((value) => {
        const next = !value;
        if (next) {
          setHasStarted(true);
          setIsDismissed(false);
        }
        return next;
      });
    },
    [activate, activeItemId],
  );

  const togglePlay = useCallback(() => {
    setPlaying((value) => {
      const next = !value;
      if (next) {
        setHasStarted(true);
        setIsDismissed(false);
      }
      return next;
    });
  }, []);

  const close = useCallback(() => {
    setPlaying(false);
    setIsDismissed(true);
    setHasStarted(false);
    setActiveItemId(null);
    setAudio(null);
    setShowName(null);
    setContentType("audio");
    setCurrentSeconds(0);
    setInlineVisible(true);
    setShowFullscreenPlayer(false);
    setLiked(false);
  }, []);

  const moveFile = useCallback((seconds: number) => {
    const element = fileRef.current;
    const current = audioRef.current;
    if (!element || !current?.audio_url) return;
    element.currentTime = (current.trim_start ?? 0) + seconds;
  }, []);

  const skipBy = useCallback(
    (deltaSeconds: number) => {
      setCurrentSeconds((prev) => {
        const next = Math.min(Math.max(prev + deltaSeconds, 0), durationSeconds);
        moveFile(next);
        return next;
      });
    },
    [durationSeconds, moveFile],
  );

  const seekTo = useCallback(
    (seconds: number) => {
      const next = Math.min(Math.max(seconds, 0), durationSeconds);
      setCurrentSeconds(next);
      moveFile(next);
    },
    [durationSeconds, moveFile],
  );

  const toggleLike = useCallback(() => {
    setLiked((value) => !value);
  }, []);

  const openFullscreenPlayer = useCallback(() => {
    setShowFullscreenPlayer(true);
  }, []);

  const closeFullscreenPlayer = useCallback(() => {
    setShowFullscreenPlayer(false);
  }, []);

  const ensureActive = useCallback(
    (itemId: string, feedAudio: FeedAudio, options?: ActivateOptions) => {
      activate(itemId, feedAudio, options);
    },
    [activate],
  );

  const value = useMemo(
    () => ({
      activeItemId,
      audio,
      showName,
      contentType,
      playing,
      currentSeconds,
      durationSeconds,
      progress,
      currentTimeLabel,
      durationLabel,
      showMiniPlayer,
      showFullscreenPlayer,
      liked,
      registerInlineElement,
      ensureActive,
      activateAndToggle,
      togglePlay,
      close,
      skipBy,
      seekTo,
      toggleLike,
      openFullscreenPlayer,
      closeFullscreenPlayer,
    }),
    [
      activeItemId,
      audio,
      showName,
      contentType,
      playing,
      currentSeconds,
      durationSeconds,
      progress,
      currentTimeLabel,
      durationLabel,
      showMiniPlayer,
      showFullscreenPlayer,
      liked,
      registerInlineElement,
      ensureActive,
      activateAndToggle,
      togglePlay,
      close,
      skipBy,
      seekTo,
      toggleLike,
      openFullscreenPlayer,
      closeFullscreenPlayer,
    ],
  );

  return <AudioPlaybackContext.Provider value={value}>{children}</AudioPlaybackContext.Provider>;
}

export function useAudioPlayback() {
  const context = useContext(AudioPlaybackContext);
  if (!context) {
    throw new Error("useAudioPlayback must be used within AudioPlaybackProvider");
  }
  return context;
}

export function useAudioPlaybackItem(itemId: string, feedAudio: FeedAudio) {
  const playback = useAudioPlayback();
  const isActive = playback.activeItemId === itemId;

  return {
    ...playback,
    isActive,
    feedAudio,
    itemId,
  };
}

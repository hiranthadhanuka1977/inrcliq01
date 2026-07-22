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
import {
  AUDIO_LANDING_TRACKS,
  DEFAULT_AUDIO_TRACK_ID,
} from "@/data/feed/audio-landing";
import { formatTimecode } from "@/lib/feed/audio-time";
import type { AudioLandingFilter, AudioLandingTrack } from "@/types/feed/audio-landing";

interface AudioLandingContextValue {
  activeTrack: AudioLandingTrack;
  playing: boolean;
  currentSeconds: number;
  progress: number;
  currentTimeLabel: string;
  activeFilter: AudioLandingFilter;
  setActiveFilter: (filter: AudioLandingFilter) => void;
  playTrack: (trackId: string) => void;
  togglePlay: () => void;
  skipBy: (deltaSeconds: number) => void;
  skipPrevious: () => void;
  skipNext: () => void;
  toggleLike: () => void;
  liked: boolean;
  showDockPlayer: boolean;
  showFullscreenPlayer: boolean;
  openFullscreenPlayer: () => void;
  closeFullscreenPlayer: () => void;
  closeDockPlayer: () => void;
  seekTo: (seconds: number) => void;
  durationLabel: string;
}

const AudioLandingContext = createContext<AudioLandingContextValue | null>(null);

const TRACK_ORDER = Object.keys(AUDIO_LANDING_TRACKS);

export function AudioLandingProvider({ children }: { children: ReactNode }) {
  const [activeTrackId, setActiveTrackId] = useState(DEFAULT_AUDIO_TRACK_ID);
  const [playing, setPlaying] = useState(false);
  const [showDockPlayer, setShowDockPlayer] = useState(false);
  const [currentSeconds, setCurrentSeconds] = useState(
    () => AUDIO_LANDING_TRACKS[DEFAULT_AUDIO_TRACK_ID].progress * AUDIO_LANDING_TRACKS[DEFAULT_AUDIO_TRACK_ID].durationSeconds,
  );
  const [activeFilter, setActiveFilter] = useState<AudioLandingFilter>("all");
  const [liked, setLiked] = useState(false);
  const [showFullscreenPlayer, setShowFullscreenPlayer] = useState(false);

  const activeTrack = AUDIO_LANDING_TRACKS[activeTrackId];
  const durationSeconds = activeTrack.durationSeconds;
  const progress = durationSeconds > 0 ? Math.min(currentSeconds / durationSeconds, 1) : 0;
  const currentTimeLabel = formatTimecode(currentSeconds);
  const durationLabel = formatTimecode(durationSeconds);

  useEffect(() => {
    if (!playing || durationSeconds <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setCurrentSeconds((prev) => {
        const next = prev + 0.1;
        return next >= durationSeconds ? durationSeconds : next;
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [playing, durationSeconds]);

  useEffect(() => {
    if (currentSeconds >= durationSeconds && durationSeconds > 0 && playing) {
      setPlaying(false);
    }
  }, [currentSeconds, durationSeconds, playing]);

  const playTrack = useCallback((trackId: string) => {
    const track = AUDIO_LANDING_TRACKS[trackId];
    if (!track) {
      return;
    }

    setActiveTrackId(trackId);
    setCurrentSeconds(track.progress * track.durationSeconds);
    setShowDockPlayer(true);
    setPlaying(true);
    setLiked(false);
  }, []);

  const togglePlay = useCallback(() => {
    setPlaying((value) => !value);
  }, []);

  const skipBy = useCallback(
    (deltaSeconds: number) => {
      setCurrentSeconds((prev) => Math.min(Math.max(prev + deltaSeconds, 0), durationSeconds));
    },
    [durationSeconds],
  );

  const seekTo = useCallback(
    (seconds: number) => {
      setCurrentSeconds(Math.min(Math.max(seconds, 0), durationSeconds));
    },
    [durationSeconds],
  );

  const openFullscreenPlayer = useCallback(() => {
    setShowFullscreenPlayer(true);
  }, []);

  const closeFullscreenPlayer = useCallback(() => {
    setShowFullscreenPlayer(false);
  }, []);

  const closeDockPlayer = useCallback(() => {
    setPlaying(false);
    setShowDockPlayer(false);
    setShowFullscreenPlayer(false);
    setLiked(false);
  }, []);

  const skipPrevious = useCallback(() => {
    const index = TRACK_ORDER.indexOf(activeTrackId);
    const prevId = TRACK_ORDER[index <= 0 ? TRACK_ORDER.length - 1 : index - 1];
    playTrack(prevId);
  }, [activeTrackId, playTrack]);

  const skipNext = useCallback(() => {
    const index = TRACK_ORDER.indexOf(activeTrackId);
    const nextId = TRACK_ORDER[(index + 1) % TRACK_ORDER.length];
    playTrack(nextId);
  }, [activeTrackId, playTrack]);

  const toggleLike = useCallback(() => {
    setLiked((value) => !value);
  }, []);

  const value = useMemo(
    () => ({
      activeTrack,
      playing,
      currentSeconds,
      progress,
      currentTimeLabel,
      activeFilter,
      setActiveFilter,
      playTrack,
      togglePlay,
      skipBy,
      skipPrevious,
      skipNext,
      toggleLike,
      liked,
      showDockPlayer,
      showFullscreenPlayer,
      openFullscreenPlayer,
      closeFullscreenPlayer,
      closeDockPlayer,
      seekTo,
      durationLabel,
    }),
    [
      activeTrack,
      playing,
      currentSeconds,
      progress,
      currentTimeLabel,
      activeFilter,
      playTrack,
      togglePlay,
      skipBy,
      skipPrevious,
      skipNext,
      toggleLike,
      liked,
      showDockPlayer,
      showFullscreenPlayer,
      openFullscreenPlayer,
      closeFullscreenPlayer,
      closeDockPlayer,
      seekTo,
      durationLabel,
    ],
  );

  return <AudioLandingContext.Provider value={value}>{children}</AudioLandingContext.Provider>;
}

export function useAudioLanding() {
  const context = useContext(AudioLandingContext);
  if (!context) {
    throw new Error("useAudioLanding must be used within AudioLandingProvider");
  }
  return context;
}

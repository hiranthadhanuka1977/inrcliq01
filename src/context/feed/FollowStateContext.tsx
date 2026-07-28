"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type FollowState = Record<string, boolean>;

type FollowStateContextValue = {
  getFollowing: (handle: string, fallback?: boolean) => boolean;
  setFollowing: (handle: string, next: boolean) => void;
};

const FollowStateContext = createContext<FollowStateContextValue | null>(null);

function normalizeHandle(handle: string): string {
  return handle.replace(/^@/, "").trim().toLowerCase();
}

/**
 * Shared in-memory follow state across feed surfaces for the current session.
 * Server/DB follow flags remain the source of truth via the `fallback` argument
 * on first read — never read browser storage during render (avoids hydration mismatches).
 */
export function FeedFollowStateProvider({ children }: { children: ReactNode }) {
  const [followState, setFollowState] = useState<FollowState>({});

  const setFollowing = useCallback((handle: string, next: boolean) => {
    const key = normalizeHandle(handle);
    if (!key) return;
    setFollowState((prev) => {
      if (prev[key] === next) return prev;
      return {
        ...prev,
        [key]: next,
      };
    });
  }, []);

  const getFollowing = useCallback(
    (handle: string, fallback = false) => {
      const key = normalizeHandle(handle);
      if (!key) return fallback;
      const value = followState[key];
      if (typeof value === "boolean") return value;
      return fallback;
    },
    [followState],
  );

  const value = useMemo<FollowStateContextValue>(
    () => ({
      getFollowing,
      setFollowing,
    }),
    [getFollowing, setFollowing],
  );

  return <FollowStateContext.Provider value={value}>{children}</FollowStateContext.Provider>;
}

export function useFeedFollowState(): FollowStateContextValue {
  const context = useContext(FollowStateContext);
  if (!context) {
    throw new Error("useFeedFollowState must be used within FeedFollowStateProvider");
  }
  return context;
}

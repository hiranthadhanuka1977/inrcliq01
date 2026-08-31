"use client";

import { createContext, useContext } from "react";

type FeedSessionValue = {
  firstName: string | null;
  avatarUrl: string | null;
  avatarColor: string | null;
  verified: boolean;
  isGuardian: boolean;
  profileHref: string | null;
};

const FeedSessionContext = createContext<FeedSessionValue>({
  firstName: null,
  avatarUrl: null,
  avatarColor: null,
  verified: false,
  isGuardian: false,
  profileHref: null,
});

export function FeedSessionProvider({
  firstName,
  avatarUrl = null,
  avatarColor = null,
  verified = false,
  isGuardian = false,
  profileHref = null,
  children,
}: {
  firstName: string | null;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  verified?: boolean;
  isGuardian?: boolean;
  profileHref?: string | null;
  children: React.ReactNode;
}) {
  return (
    <FeedSessionContext.Provider
      value={{ firstName, avatarUrl, avatarColor, verified, isGuardian, profileHref }}
    >
      {children}
    </FeedSessionContext.Provider>
  );
}

export function useFeedSession() {
  return useContext(FeedSessionContext);
}

"use client";

import { createContext, useContext } from "react";

type FeedSessionValue = {
  firstName: string | null;
  avatarUrl: string | null;
  avatarColor: string | null;
  verified: boolean;
};

const FeedSessionContext = createContext<FeedSessionValue>({
  firstName: null,
  avatarUrl: null,
  avatarColor: null,
  verified: false,
});

export function FeedSessionProvider({
  firstName,
  avatarUrl = null,
  avatarColor = null,
  verified = false,
  children,
}: {
  firstName: string | null;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  verified?: boolean;
  children: React.ReactNode;
}) {
  return (
    <FeedSessionContext.Provider value={{ firstName, avatarUrl, avatarColor, verified }}>
      {children}
    </FeedSessionContext.Provider>
  );
}

export function useFeedSession() {
  return useContext(FeedSessionContext);
}

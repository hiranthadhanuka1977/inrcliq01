"use client";

import { createContext, useContext } from "react";

type FeedSessionValue = {
  firstName: string | null;
  avatarUrl: string | null;
  avatarColor: string | null;
};

const FeedSessionContext = createContext<FeedSessionValue>({
  firstName: null,
  avatarUrl: null,
  avatarColor: null,
});

export function FeedSessionProvider({
  firstName,
  avatarUrl = null,
  avatarColor = null,
  children,
}: {
  firstName: string | null;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  children: React.ReactNode;
}) {
  return (
    <FeedSessionContext.Provider value={{ firstName, avatarUrl, avatarColor }}>
      {children}
    </FeedSessionContext.Provider>
  );
}

export function useFeedSession() {
  return useContext(FeedSessionContext);
}

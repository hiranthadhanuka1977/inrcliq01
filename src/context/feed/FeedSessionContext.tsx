"use client";

import { createContext, useContext } from "react";

type FeedSessionValue = {
  firstName: string | null;
};

const FeedSessionContext = createContext<FeedSessionValue>({ firstName: null });

export function FeedSessionProvider({
  firstName,
  children,
}: {
  firstName: string | null;
  children: React.ReactNode;
}) {
  return (
    <FeedSessionContext.Provider value={{ firstName }}>
      {children}
    </FeedSessionContext.Provider>
  );
}

export function useFeedSession() {
  return useContext(FeedSessionContext);
}

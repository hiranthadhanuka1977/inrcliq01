import type { Metadata } from "next";
import FeedPathShell from "@/components/feed/FeedPathShell";
import { FeedFollowStateProvider } from "@/context/feed/FollowStateContext";
import { FeedSessionProvider } from "@/context/feed/FeedSessionContext";
import { getSessionNavProfile } from "@/lib/feed/session-nav-profile";
import "@/styles/feed/feed-app.css";

export const metadata: Metadata = {
  title: "INRCLIQ · Live Feed",
  description: "INRCLIQ home feed powered by JSON data",
};

export default async function FeedLayout({ children }: { children: React.ReactNode }) {
  const { firstName, avatarUrl, avatarColor } = await getSessionNavProfile();

  return (
    <FeedSessionProvider firstName={firstName} avatarUrl={avatarUrl} avatarColor={avatarColor}>
      <FeedFollowStateProvider>
        <FeedPathShell>
          <div className="feed-app-root">{children}</div>
        </FeedPathShell>
      </FeedFollowStateProvider>
    </FeedSessionProvider>
  );
}

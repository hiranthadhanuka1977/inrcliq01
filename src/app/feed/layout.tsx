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
  const navProfile = await getSessionNavProfile();

  return (
    <FeedSessionProvider
      firstName={navProfile.firstName}
      avatarUrl={navProfile.avatarUrl}
      avatarColor={navProfile.avatarColor}
      verified={navProfile.verified}
      isGuardian={navProfile.isGuardian}
      profileHref={navProfile.profileHref}
    >
      <FeedFollowStateProvider>
        <FeedPathShell>
          <div className="feed-app-root">{children}</div>
        </FeedPathShell>
      </FeedFollowStateProvider>
    </FeedSessionProvider>
  );
}

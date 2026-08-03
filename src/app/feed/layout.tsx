import type { Metadata } from "next";
import Script from "next/script";
import FeedPathShell from "@/components/feed/FeedPathShell";
import { FeedFollowStateProvider } from "@/context/feed/FollowStateContext";
import { FeedSessionProvider } from "@/context/feed/FeedSessionContext";
import { FeedThemeProvider } from "@/context/feed/FeedThemeContext";
import { FEED_THEME_BOOTSTRAP } from "@/lib/feed/theme";
import { getSessionUser } from "@/lib/session";
import "@/styles/feed/feed-app.css";

export const metadata: Metadata = {
  title: "INRCLIQ · Live Feed",
  description: "INRCLIQ home feed powered by JSON data",
};

export default async function FeedLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const firstName = user?.firstName?.trim() || null;

  return (
    <FeedSessionProvider firstName={firstName}>
      <FeedFollowStateProvider>
        <FeedThemeProvider>
          <Script
            id="feed-theme"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{ __html: FEED_THEME_BOOTSTRAP }}
          />
          <FeedPathShell>
            <div className="feed-app-root">{children}</div>
          </FeedPathShell>
        </FeedThemeProvider>
      </FeedFollowStateProvider>
    </FeedSessionProvider>
  );
}

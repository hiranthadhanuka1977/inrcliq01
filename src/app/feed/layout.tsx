import type { Metadata } from "next";
import FeedPathShell from "@/components/feed/FeedPathShell";
import { FeedSessionProvider } from "@/context/feed/FeedSessionContext";
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
      <FeedPathShell>
        <div className="feed-app-root">{children}</div>
      </FeedPathShell>
    </FeedSessionProvider>
  );
}

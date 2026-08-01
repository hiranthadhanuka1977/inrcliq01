import { Suspense } from "react";
import MessagesView from "@/components/feed/messages/MessagesView";
import { getMessagesPageData } from "@/lib/feed/messages-server";

export const metadata = {
  title: "Messages · INRCLIQ",
};

export default async function MessagesPage() {
  const { conversations } = await getMessagesPageData();

  return (
    <div className="page-messages">
      <Suspense fallback={<MessagesView initialConversations={conversations} />}>
        <MessagesView initialConversations={conversations} />
      </Suspense>
    </div>
  );
}

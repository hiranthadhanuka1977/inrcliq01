import { FeedMgmtList } from "@/components/settings/FeedMgmtList";
import { listSettingsFeedPosts } from "@/lib/settings/feed-posts";

export const dynamic = "force-dynamic";

export default async function SettingsFeedMgmtPage() {
  const posts = await listSettingsFeedPosts();

  return <FeedMgmtList posts={posts} />;
}

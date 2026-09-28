import { FeedMgmtList } from "@/components/settings/FeedMgmtList";
import { listSettingsFeedPosts } from "@/lib/settings/feed-posts";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SettingsFeedMgmtPage({ searchParams }: PageProps) {
  const [posts, { q }] = await Promise.all([listSettingsFeedPosts(), searchParams]);

  return <FeedMgmtList key={q ?? ""} posts={posts} initialQuery={q ?? ""} />;
}

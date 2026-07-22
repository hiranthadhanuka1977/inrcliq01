import HomeFeed from "@/components/feed/HomeFeed";
import { getFeedData } from "@/lib/feed/feed";

export default async function Home() {
  const feed = await getFeedData();

  return (
    <div className="page-home">
      <HomeFeed items={feed.items} categories={feed.categories} />
    </div>
  );
}

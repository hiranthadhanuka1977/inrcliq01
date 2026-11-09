import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import VideoShelfView from "@/components/feed/VideoShelfView";
import { loadVideoShelf, videoShelfCategories } from "@/lib/feed/video-shelf";
import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Videos · INRCLIQ",
  description: "Watch videos from posts and Creator Studio",
};

export default async function VideosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const shelf = await loadVideoShelf(user.id, user.ageZone);

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-content">
        <main className="yt-page">
          <header className="yt-page__header">
            <h1>Videos</h1>
          </header>
          <VideoShelfView videos={shelf.videos} categories={videoShelfCategories(shelf)} />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

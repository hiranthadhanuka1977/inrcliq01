import FeedMediaPlaceholderView from "@/components/feed/FeedMediaPlaceholderView";

export const metadata = {
  title: "INRCLIQ · Videos",
  description: "Video feed on INRCLIQ — coming soon",
};

export default function VideosPage() {
  return (
    <div className="page-home">
      <FeedMediaPlaceholderView
        title="Videos"
        icon="videos"
        description="Videos will live here soon. This is a placeholder page while the experience is being built."
      />
    </div>
  );
}

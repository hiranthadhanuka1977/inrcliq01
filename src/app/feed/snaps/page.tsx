import FeedMediaPlaceholderView from "@/components/feed/FeedMediaPlaceholderView";

export const metadata = {
  title: "INRCLIQ · Snaps",
  description: "Short snaps on INRCLIQ — coming soon",
};

export default function SnapsPage() {
  return (
    <div className="page-home">
      <FeedMediaPlaceholderView
        title="Snaps"
        icon="snaps"
        description="Snaps will live here soon. This is a placeholder page while the experience is being built."
      />
    </div>
  );
}

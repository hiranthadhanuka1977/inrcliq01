import FeedMediaPlaceholderView from "@/components/feed/FeedMediaPlaceholderView";

export const metadata = {
  title: "INRCLIQ · Photos",
  description: "Photo feed on INRCLIQ — coming soon",
};

export default function PhotosPage() {
  return (
    <div className="page-home">
      <FeedMediaPlaceholderView
        title="Photos"
        icon="photos"
        description="Photos will live here soon. This is a placeholder page while the experience is being built."
      />
    </div>
  );
}

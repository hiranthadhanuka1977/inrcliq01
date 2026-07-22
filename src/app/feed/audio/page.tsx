import AudioLandingPage from "@/components/feed/audio-landing/AudioLandingPage";

export const metadata = {
  title: "INRCLIQ · Audio",
  description: "Discover music, podcasts, and audiobooks on INRCLIQ",
};

export default function AudioPage() {
  return (
    <div className="page-audio">
      <AudioLandingPage />
    </div>
  );
}

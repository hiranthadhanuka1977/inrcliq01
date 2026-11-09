/** Length already saved on the video, or read once for the cards on screen. */
export default function VideoDurationBadge({ label }: { label: string | null }) {
  if (!label) return null;
  return <span className="yt-card__duration">{label}</span>;
}

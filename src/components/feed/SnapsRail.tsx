import { homeSnaps } from "@/data/feed/snaps";
import MediaPlayOverlay from "@/components/feed/MediaPlayOverlay";

export default function SnapsRail() {
  return (
    <section className="rail snaps-rail" id="snaps-rail" aria-label="Snaps">
      <div className="rail-title">
        <h3>Snaps · because you watched Dua Lipa</h3>
        <a className="rail-title__link" href="#">
          See all →
        </a>
      </div>

      <div className="snap-grid">
        {homeSnaps.map((snap) => (
          <a key={snap.id} className="snap-tile" href="#">
            <img src={snap.image} alt="" />
            <MediaPlayOverlay className="snap-tile__play" />
            <span className="snap-tile__duration">{snap.duration}</span>
            <div className="snap-tile__overlay">
              <span className="snap-tile__views">{snap.views}</span>
              <span className="snap-tile__creator">
                <span className="snap-tile__avatar">
                  <img src={snap.avatar} alt="" />
                </span>
                <span className="snap-tile__handle">
                  {snap.handle} · <span className="snap-tile__meta">{snap.tag}</span>
                </span>
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

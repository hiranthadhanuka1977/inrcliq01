"use client";

import { useStoriesCarousel } from "@/hooks/feed/useStoriesCarousel";

const stories = [
  { name: "Taylor", color: "#4f46e5", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120&q=80&auto=format&fit=crop", ring: "gradient" as const },
  { name: "Jennifer", color: "#8b5cf6", initials: "JL", ring: "muted" as const, offline: true },
  { name: "Bruno", color: "#a21caf", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=120&q=80&auto=format&fit=crop", ring: "gradient" as const },
  { name: "Dua", color: "#c026d3", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=120&q=80&auto=format&fit=crop", ring: "gradient" as const, offline: true },
  { name: "Billie", color: "#0f766e", initials: "BE", ring: "muted" as const, offline: true },
  { name: "Olivia", color: "#6d28d9", initials: "OR", ring: "gradient" as const },
  { name: "Miley", color: "#ef4444", initials: "MC", ring: "gradient" as const, offline: true },
  { name: "Ed S.", color: "#166534", initials: "ED", ring: "muted" as const },
  { name: "Ariana", color: "#f97316", image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=120&q=80&auto=format&fit=crop", ring: "gradient" as const },
  { name: "Post M.", color: "#4338ca", initials: "PM", ring: "muted" as const, offline: true },
  { name: "SZA", color: "#be185d", initials: "SZ", ring: "muted" as const },
  { name: "Drake", color: "#374151", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120&q=80&auto=format&fit=crop", ring: "muted" as const, offline: true },
  { name: "Adele", color: "#b45309", image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=120&q=80&auto=format&fit=crop", ring: "muted" as const },
  { name: "Sam S.", color: "#0e7490", initials: "SS", ring: "muted" as const, offline: true },
  { name: "The Week...", color: "#7c2d12", initials: "WK", ring: "muted" as const },
  { name: "Doja", color: "#6d28d9", initials: "DC", ring: "gradient" as const, offline: true },
  { name: "Harry", color: "#2563eb", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=120&q=80&auto=format&fit=crop", ring: "gradient" as const },
  { name: "Lana", color: "#9d174d", initials: "LD", ring: "gradient" as const },
  { name: "Kendrick", color: "#1f2937", initials: "KL", ring: "muted" as const, offline: true },
  { name: "Rihanna", color: "#dc2626", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&q=80&auto=format&fit=crop", ring: "gradient" as const },
  { name: "Shawn", color: "#ca8a04", initials: "SM", ring: "muted" as const },
  { name: "Camila", color: "#db2777", image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&q=80&auto=format&fit=crop", ring: "gradient" as const, offline: true },
];

export default function StoriesBar() {
  const { storiesRef, trackRef, prevRef, nextRef } = useStoriesCarousel();

  return (
    <section className="stories-bar" aria-label="Stories">
      <div className="stories" ref={storiesRef}>
        <div className="stories-track" id="stories-track" ref={trackRef}>
          <a className="story story--snap" href="#">
            <div className="story-avatar-ring story-avatar-ring--muted">
              <div className="story-avatar story-avatar--snap" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
            </div>
            <span>Your Snap</span>
          </a>

          {stories.map((story) => (
            <a key={story.name} className="story" href="#">
              <div className={`story-avatar-ring story-avatar-ring--${story.ring}`}>
                <div
                  className={`story-avatar${story.offline ? " story-avatar--offline" : ""}`}
                  style={{ "--story-color": story.color } as React.CSSProperties}
                >
                  {story.image ? (
                    <img src={story.image} alt={story.name} />
                  ) : (
                    story.initials
                  )}
                </div>
              </div>
              <span>{story.name}</span>
            </a>
          ))}
        </div>

        <button
          ref={prevRef}
          className="story-nav story-nav--prev"
          type="button"
          aria-label="Previous stories"
          disabled
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          ref={nextRef}
          className="story-nav story-nav--next"
          type="button"
          aria-label="Next stories"
          disabled
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </section>
  );
}

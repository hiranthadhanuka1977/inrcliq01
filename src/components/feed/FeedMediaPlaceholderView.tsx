"use client";

import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import { NavIcon, type NavIconName } from "@/lib/feed/nav-icons";

export default function FeedMediaPlaceholderView({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: NavIconName;
}) {
  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-content">
        <div className="content-layout">
          <main className="feed-media-placeholder" aria-labelledby="feed-media-placeholder-title">
            <span className="feed-media-placeholder__icon" aria-hidden="true">
              <NavIcon name={icon} />
            </span>
            <p className="feed-media-placeholder__eyebrow">Coming soon</p>
            <h1 id="feed-media-placeholder-title" className="feed-media-placeholder__title">
              {title}
            </h1>
            <p className="feed-media-placeholder__body">{description}</p>
          </main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}

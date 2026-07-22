"use client";

import { useRef } from "react";
import AudioMiniPlayer from "@/components/feed/AudioMiniPlayer";
import FeedAudioFullscreenPlayer from "@/components/feed/FeedAudioFullscreenPlayer";
import MobileNav from "@/components/feed/MobileNav";
import FeedScrollButton from "@/components/feed/FeedScrollButton";
import AudioTopCreators from "@/components/feed/audio/AudioTopCreators";
import CreatorsRail from "@/components/feed/CreatorsRail";
import SnapsRail from "@/components/feed/SnapsRail";
import CategoryFilters from "@/components/feed/CategoryFilters";
import FeedLoading from "@/components/feed/FeedLoading";
import FeedPost from "@/components/feed/FeedPost";
import LeftNav from "@/components/feed/LeftNav";
import PageBodyClass from "@/components/feed/PageBodyClass";
import RightRail from "@/components/feed/RightRail";
import SpotifyLanding from "@/components/feed/SpotifyLanding";
import StoriesBar from "@/components/feed/StoriesBar";
import type { FeedItem } from "@/types/feed/feed";
import { useFeedFilter } from "@/hooks/feed/useFeedFilter";
import { useFeedPagination } from "@/hooks/feed/useFeedPagination";
import { useStoriesScrollHide } from "@/hooks/feed/useStoriesScrollHide";
import { AudioPlaybackProvider, useAudioPlayback } from "@/context/feed/AudioPlaybackContext";

const SHOW_CREATORS_RAIL = false;

interface HomeFeedProps {
  items: FeedItem[];
  categories: string[];
}

function HomeFeedContent({ items, categories }: HomeFeedProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const { activeCategory, setActiveCategory, filteredItems, isLoading } = useFeedFilter(items);
  const { visibleItems, hasMore, isLoadingMore, sentinelRef } = useFeedPagination(filteredItems);
  const { showMiniPlayer } = useAudioPlayback();
  useStoriesScrollHide(headerRef);

  return (
    <>
      <PageBodyClass pageClass="page-home" />
      <div className={`app-shell${showMiniPlayer ? " app-shell--audio-dock" : ""}`}>
        <LeftNav />
        <div className="main-content">
          <div className="feed-header" id="feed-top" ref={headerRef}>
            <StoriesBar />
          </div>

          <div className="content-layout">
            <div className="content-row">
              <main className="feed-main feed-surface feed-surface--simple">
                <CategoryFilters categories={categories} activeCategory={activeCategory} onChange={setActiveCategory}>
                  <SpotifyLanding />
                </CategoryFilters>
                {isLoading ? (
                  <FeedLoading />
                ) : (
                  <>
                    {visibleItems.flatMap((item, index) => {
                      const nodes = [<FeedPost key={item.id} item={item} />];
                      if (index === 0) {
                        nodes.push(<AudioTopCreators key="audio-top-creators" />);
                      }
                      if (SHOW_CREATORS_RAIL && index === 2) {
                        nodes.push(<CreatorsRail key="creators-rail" />);
                      }
                      if (index === 8) {
                        nodes.push(<SnapsRail key="snaps-rail" />);
                      }
                      return nodes;
                    })}
                    {isLoadingMore ? <FeedLoading compact /> : null}
                    {hasMore ? (
                      <div ref={sentinelRef} className="feed-load-sentinel" aria-hidden="true" />
                    ) : null}
                  </>
                )}
              </main>
              <RightRail />
            </div>
          </div>
        </div>
        <AudioMiniPlayer />
        <FeedAudioFullscreenPlayer />
        <FeedScrollButton variant="home" topTargetId="feed-top" />
      </div>
      <MobileNav />
    </>
  );
}

export default function HomeFeed({ items, categories }: HomeFeedProps) {
  return (
    <AudioPlaybackProvider>
      <HomeFeedContent items={items} categories={categories} />
    </AudioPlaybackProvider>
  );
}

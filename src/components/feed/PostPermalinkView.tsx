"use client";

import Link from "next/link";
import AudioMiniPlayer from "@/components/feed/AudioMiniPlayer";
import FeedAudioFullscreenPlayer from "@/components/feed/FeedAudioFullscreenPlayer";
import FeedPost from "@/components/feed/FeedPost";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import { AudioPlaybackProvider, useAudioPlayback } from "@/context/feed/AudioPlaybackContext";
import { useFeedFollowState } from "@/context/feed/FollowStateContext";
import type { FeedItem } from "@/types/feed/feed";

function PostPermalinkContent({ item }: { item: FeedItem }) {
  const { getFollowing, setFollowing } = useFeedFollowState();
  const { showMiniPlayer } = useAudioPlayback();

  return (
    <>
      <div className={`app-shell${showMiniPlayer ? " app-shell--audio-dock" : ""}`}>
        <LeftNav />
        <div className="main-content">
          <div className="content-layout">
            <div className="content-row">
              <main className="feed-main feed-surface feed-surface--simple" aria-label="Post">
                <Link href="/feed" className="profile-directory__back post-permalink__back">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                  </svg>
                  Feed
                </Link>
                <FeedPost
                  item={item}
                  following={getFollowing(item.author.handle, item.relationship.following)}
                  onFollowingChange={(next) => setFollowing(item.author.handle, next)}
                />
              </main>
            </div>
          </div>
        </div>
        <AudioMiniPlayer />
        <FeedAudioFullscreenPlayer />
      </div>
      <MobileNav />
    </>
  );
}

export default function PostPermalinkView({ item }: { item: FeedItem }) {
  return (
    <AudioPlaybackProvider>
      <PostPermalinkContent item={item} />
    </AudioPlaybackProvider>
  );
}

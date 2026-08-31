"use client";

import AudioMiniPlayer from "@/components/feed/AudioMiniPlayer";
import FeedAudioFullscreenPlayer from "@/components/feed/FeedAudioFullscreenPlayer";
import MobileNav from "@/components/feed/MobileNav";
import PageBodyClass from "@/components/feed/PageBodyClass";
import FeedPost from "@/components/feed/FeedPost";
import FeedScrollButton from "@/components/feed/FeedScrollButton";
import LeftNav from "@/components/feed/LeftNav";
import FirstPostPromptCard from "@/components/feed/account/FirstPostPromptCard";
import ShareOnSocialPrompt from "@/components/feed/account/ShareOnSocialPrompt";
import ProfileCollection from "@/components/feed/profile/ProfileCollection";
import ProfileHeader from "@/components/feed/profile/ProfileHeader";
import ProfilePopularPosts from "@/components/feed/profile/ProfilePopularPosts";
import { AudioPlaybackProvider, useAudioPlayback } from "@/context/feed/AudioPlaybackContext";
import { useFeedFollowState } from "@/context/feed/FollowStateContext";
import type { ProfileData } from "@/types/feed/profile";

function ProfileViewContent({ profile }: { profile: ProfileData }) {
  const { showMiniPlayer } = useAudioPlayback();
  const { getFollowing, setFollowing } = useFeedFollowState();
  const following = getFollowing(profile.handle, profile.relationship?.following ?? false);
  const hasPopular = profile.popular_posts.length > 0;
  const hasFeed = profile.feed_posts.length > 0;
  const hasPosts = hasPopular || hasFeed;

  return (
    <>
      <PageBodyClass pageClass="page-profile" />
      <div className={`app-shell page-profile${showMiniPlayer ? " app-shell--audio-dock" : ""}`}>
        <LeftNav />
        <main className="main-content profile-page">
          <ProfileHeader
            profile={profile}
            following={following}
            onFollowingChange={(next) => setFollowing(profile.handle, next)}
          />

          <div className="profile-page__inner">
            {profile.is_own && hasPosts ? (
              <ShareOnSocialPrompt
                firstName={profile.name.split(/\s+/)[0] || null}
                handle={profile.handle}
                profileHref={`/feed/profile/${profile.slug}`}
                dismissKey={profile.slug}
              />
            ) : null}

            {profile.collection.length > 0 ? (
              <ProfileCollection
                slug={profile.slug}
                creatorName={profile.name}
                items={profile.collection}
                enabled={profile.collection_enabled !== false}
              />
            ) : null}

            {hasPosts ? (
              <>
                {hasPopular ? <ProfilePopularPosts posts={profile.popular_posts} /> : null}

                {hasFeed ? (
                  <section className="profile-feed" id="profile-feed" aria-labelledby="profile-feed-heading">
                    <div className="profile-section__head profile-feed__head">
                      <h2 id="profile-feed-heading">Feed</h2>
                    </div>
                    <div className="profile-feed__list feed-main feed-surface feed-surface--simple">
                      {profile.feed_posts.map((item) => (
                        <FeedPost
                          key={item.id}
                          item={item}
                          following={following}
                          onFollowingChange={(next) => setFollowing(profile.handle, next)}
                          hideFollow={Boolean(profile.is_own)}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}
              </>
            ) : profile.is_own ? (
              <section className="profile-feed" aria-label="Create your first post">
                <FirstPostPromptCard
                  firstName={profile.name.split(/\s+/)[0] || null}
                  dismissKey={profile.slug}
                  verified={profile.verified}
                />
              </section>
            ) : (
              <section className="profile-feed-empty" aria-labelledby="profile-feed-empty-heading">
                <span className="profile-feed-empty__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 5h16v14H4z" />
                    <path d="M8 9h8" />
                    <path d="M8 13h5" />
                  </svg>
                </span>
                <h2 id="profile-feed-empty-heading">No posts yet</h2>
                <p>{`${profile.name} hasn’t posted yet. Check back later.`}</p>
              </section>
            )}
          </div>
        </main>
        <AudioMiniPlayer />
        <FeedAudioFullscreenPlayer />
        {hasFeed ? (
          <FeedScrollButton variant="profile" topTargetId="profile-top" feedTargetId="profile-feed" />
        ) : null}
      </div>
      <MobileNav />
    </>
  );
}

export default function ProfileView({ profile }: { profile: ProfileData }) {
  return (
    <AudioPlaybackProvider>
      <ProfileViewContent profile={profile} />
    </AudioPlaybackProvider>
  );
}

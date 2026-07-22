"use client";

import MediaPlayOverlay from "@/components/feed/MediaPlayOverlay";
import type { ProfilePopularPost } from "@/types/feed/profile";

export default function ProfilePopularPosts({ posts }: { posts: ProfilePopularPost[] }) {
  return (
    <section className="profile-section" aria-labelledby="popular-posts-heading">
      <div className="profile-section__head">
        <h2 id="popular-posts-heading">
          Popular posts <span aria-hidden="true">›</span>
        </h2>
      </div>
      <div className="profile-posts" id="popular-posts">
        {posts.map((post) => (
          <article key={post.title} className="profile-post-card">
            <div
              className={`profile-post-card__thumb${post.members_only ? " profile-post-card__thumb--subscriber-locked" : ""}`}
            >
              <div className="profile-post-card__thumb-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.image} alt="" width={520} height={325} />
              </div>
              {post.members_only ? (
                <span className="profile-post-card__lock" tabIndex={0} aria-label="Subscriber access only">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                  </svg>
                  <span className="profile-post-card__lock-popover" role="tooltip">
                    You need to activate a subscription with this creator to access exclusive content.
                  </span>
                </span>
              ) : null}
              {post.has_video && !post.members_only ? (
                <MediaPlayOverlay className="profile-post-card__play" />
              ) : null}
            </div>
            <h3>{post.title}</h3>
            <div className="profile-post-card__meta">
              <span>{post.posted_ago}</span>
              <span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                {post.likes}
              </span>
              <span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z" />
                </svg>
                {post.comments}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

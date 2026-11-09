import type { CSSProperties } from "react";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import StudioPlayer from "@/components/feed/StudioPlayer";
import { VideoShelfRail } from "@/components/feed/VideoShelfCard";
import { loadPostShelfVideo, loadVideoShelf } from "@/lib/feed/video-shelf";
import { getSessionUser } from "@/lib/session";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PostVideoPage({
  params,
}: {
  params: Promise<{ postId: string; index: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const { postId, index } = await params;
  const itemIndex = Number(index);
  if (!Number.isInteger(itemIndex) || itemIndex < 0) notFound();

  const video = await loadPostShelfVideo(user.id, user.ageZone, postId, itemIndex);
  if (!video?.playback) notFound();
  const shelf = await loadVideoShelf(user.id, user.ageZone, { limit: 24 });

  const profileHref = video.authorSlug ? `/feed/profile/${video.authorSlug}` : null;
  const caption = video.caption && video.caption !== video.title ? video.caption : null;
  const description =
    video.description && video.description !== video.title && video.description !== video.caption
      ? video.description
      : null;
  const upNext = shelf.videos.filter((item) => item.key !== video.key).slice(0, 12);

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-content">
        <main className="yt-page yt-watch">
          <div className="yt-watch__primary">
            <div className="yt-player">
              <StudioPlayer
                kind="VIDEO"
                src={video.playback.src}
                poster={video.playback.poster}
                startMs={video.playback.startMs}
                endMs={video.playback.endMs}
                autoPlay
              />
            </div>
            <h1>{video.title}</h1>
            <div className="yt-watch__author">
              <span
                className="yt-card__avatar"
                style={{ "--story-color": video.avatarColor } as CSSProperties}
                aria-hidden="true"
              >
                {video.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={video.avatarUrl} alt="" />
                ) : (
                  video.avatarInitials
                )}
              </span>
              <div>
                {profileHref ? (
                  <a className="yt-watch__name" href={profileHref}>
                    {video.authorName}
                  </a>
                ) : (
                  <p className="yt-watch__name">{video.authorName}</p>
                )}
                <p className="yt-watch__sub">
                  {video.subtitle}
                  {video.membersOnly ? " · Members" : ""}
                </p>
              </div>
            </div>
            {caption || description ? (
              <div className="yt-watch__description">
                {caption ? <p>{caption}</p> : null}
                {description ? <p>{description}</p> : null}
              </div>
            ) : null}
          </div>
          <VideoShelfRail items={upNext} currentKey={video.key} />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

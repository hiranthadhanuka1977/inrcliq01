import Link from "next/link";
import { postShareHref, type PostSharePayload } from "@/lib/feed/post-share-message";

export default function SharedPostCard({
  share,
  time,
  fromMe,
}: {
  share: PostSharePayload;
  time: string;
  fromMe: boolean;
}) {
  const handle = share.authorHandle;
  const line = share.membersOnly
    ? "Members only"
    : share.text || (share.hasVideo ? "Video" : share.imageUrl ? "Photo" : "Post");
  const videoSrc = share.videoUrl ? `${share.videoUrl}#t=0.1` : null;

  return (
    <article className={`messages-post-share${fromMe ? " is-mine" : ""}`}>
      <Link href={postShareHref(share.postId)} className="messages-post-share__card">
        <span className="messages-post-share__media">
          {share.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={share.imageUrl} alt={share.imageAlt || ""} />
          ) : videoSrc ? (
            <video src={videoSrc} muted playsInline preload="metadata" aria-hidden="true" />
          ) : (
            <span className="messages-post-share__mark" aria-hidden="true">
              {share.membersOnly ? "Members" : share.hasVideo ? "Video" : "Post"}
            </span>
          )}
          {share.hasVideo ? <span className="messages-post-share__play" aria-hidden="true" /> : null}
        </span>
        <span className="messages-post-share__body">
          <span className="messages-post-share__kicker">Post</span>
          <span className="messages-post-share__author">
            {share.authorName}
            {handle ? <span className="messages-post-share__handle">{handle}</span> : null}
          </span>
          <span className="messages-post-share__text">{line}</span>
          <time className="messages-post-share__time">{time}</time>
        </span>
      </Link>
    </article>
  );
}

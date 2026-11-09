import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import StudioPlayer from "@/components/feed/StudioPlayer";
import { VideoShelfRail } from "@/components/feed/VideoShelfCard";
import { loadVideoShelf } from "@/lib/feed/video-shelf";
import { addStudioComment } from "@/lib/studio/comment-action";
import { isStudioMediaUrl, getStudioWatch, studioShapeLabel } from "@/lib/studio/library";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const AUDIENCE_LABEL: Record<string, string> = {
  PUBLIC: "Public",
  FOLLOWERS: "Followers",
  MEMBERS: "Members",
  UNLISTED: "Unlisted",
};

export default async function VideoWatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ comment?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  const { id } = await params;
  const query = await searchParams;
  const result = await getStudioWatch(id, user.id, user.ageZone);
  if (result.kind === "missing") notFound();

  const project = result.project;
  if (project.mediaKind !== "VIDEO") notFound();
  const slug = project.creator.slug;
  let attachment: { href: string; label: string } | null = null;
  if (result.kind === "open" && project.attachmentType === "PRODUCT" && project.attachmentId && slug) {
    const product = await prisma.collectionProduct.findFirst({
      where: { id: project.attachmentId, collection: { creatorId: project.creatorId } },
      select: { name: true },
    });
    if (product) {
      attachment = { href: `/feed/profile/${slug}/collection/${project.attachmentId}`, label: product.name };
    }
  } else if (result.kind === "open" && project.attachmentType === "REQUEST" && slug) {
    attachment = { href: `/feed/profile/${slug}/requests`, label: "Special request" };
  }

  const mediaUrl = project.mediaUrl && isStudioMediaUrl(project.mediaUrl) ? project.mediaUrl : null;
  const coverUrl = project.thumbnailUrl && isStudioMediaUrl(project.thumbnailUrl) ? project.thumbnailUrl : null;
  const shelf = await loadVideoShelf(user.id, user.ageZone, { limit: 24 });
  const upNext = shelf.videos.filter((item) => item.href !== `/feed/videos/${project.id}`).slice(0, 12);

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-content">
        <div className="yt-page yt-watch">
          <main className="video-watch yt-watch__primary">
            <p className="video-watch__kicker">
              {studioShapeLabel(project.shape)}
              {project.show ? ` · ${project.show.title}` : ""}
              {` · ${AUDIENCE_LABEL[project.audience] ?? "Public"}`}
            </p>
            {result.kind === "locked" ? (
              <>
                <h1>{project.title || "Untitled"}</h1>
                <p className="video-watch__lock">
                  {project.audience === "MEMBERS"
                    ? "Subscribe to this creator to play this."
                    : project.audience === "FOLLOWERS"
                      ? "Follow this creator to play this."
                      : "This piece is not available for your age group."}
                </p>
              </>
            ) : (
              <>
                {mediaUrl ? (
                  <div className="yt-player">
                    <StudioPlayer kind="VIDEO" src={mediaUrl} poster={coverUrl} startMs={project.trimStartMs} endMs={project.trimEndMs} autoPlay />
                  </div>
                ) : null}
                <h1>{project.title || "Untitled"}</h1>
                <p className="video-watch__meta">
                  {slug ? (
                    <a className="video-watch__link" href={`/feed/profile/${slug}`}>
                      {project.creator.name}
                    </a>
                  ) : (
                    project.creator.name
                  )}
                </p>
                {project.parent?.status === "PUBLISHED" ? (
                  <p className="video-watch__copy">
                    {studioShapeLabel(project.shape)} of{" "}
                    <a className="video-watch__link" href={`/feed/videos/${project.parent.id}`}>
                      {project.parent.title || "Untitled"}
                    </a>
                  </p>
                ) : null}
                {project.description ? <p className="video-watch__copy">{project.description}</p> : null}
                {attachment ? (
                  <p>
                    <a className="video-watch__link" href={attachment.href}>
                      {attachment.label}
                    </a>
                  </p>
                ) : null}
                <section className="video-watch__comments">
                  <h2>Comments</h2>
                  {project.commentsEnabled ? (
                    <>
                      {project.comments.length === 0 ? <p className="video-watch__meta">No comments yet.</p> : null}
                      {project.comments.map((comment) => (
                        <article key={comment.id} className="video-watch__comment">
                          <strong>{comment.user.firstName || comment.user.handle || "Member"}</strong>
                          <p>{comment.body}</p>
                        </article>
                      ))}
                      <form className="video-watch__form" action={addStudioComment}>
                        <input type="hidden" name="projectId" value={project.id} />
                        <label htmlFor="comment-body">Add a comment</label>
                        <textarea id="comment-body" name="body" maxLength={500} required />
                        {query.comment === "invalid" ? <p>Keep the comment under 500 characters.</p> : null}
                        <button className="btn btn--primary" type="submit">
                          Post comment
                        </button>
                      </form>
                    </>
                  ) : (
                    <p className="video-watch__meta">Comments are turned off for this piece.</p>
                  )}
                </section>
              </>
            )}
          </main>
          <VideoShelfRail items={upNext} currentKey={`studio:${project.id}`} />
        </div>
      </div>
      <MobileNav />
    </div>
  );
}

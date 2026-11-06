import { notFound } from "next/navigation";
import Gate from "../../../components/Gate";
import ProjectMenu from "../../../components/ProjectMenu";
import Shell from "../../../components/Shell";
import { getStudioContext } from "../../../lib/context";
import { AGE_RATINGS, AUDIENCES, LANGUAGES, mediaForShape, shapeById } from "../../../lib/labels";
import { mainOrigin, mediaSrc } from "../../../lib/media";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

function lozenge(status: string) {
  if (status === "PUBLISHED") return "admin-lozenge admin-lozenge--success";
  if (status === "SCHEDULED") return "admin-lozenge admin-lozenge--warning";
  if (status === "HIDDEN") return "admin-lozenge";
  return "admin-lozenge admin-lozenge--info";
}

function labelOf(list: { id: string; label: string }[], id: string) {
  return list.find((item) => item.id === id)?.label ?? id;
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const ctx = await getStudioContext();
  if (ctx.kind === "signed-out") return <Gate />;
  if (ctx.kind === "blocked") return <Gate reason={ctx.reason} />;

  const { id } = await params;
  const query = await searchParams;
  const project = await prisma.studioProject.findFirst({
    where: { id, userId: ctx.user.id },
    include: {
      show: { select: { id: true, title: true } },
      parent: { select: { id: true, title: true, mediaKind: true } },
    },
  });
  if (!project) notFound();
  const spec = shapeById(project.shape);
  if (!spec) notFound();

  const mediaKind = mediaForShape(spec, project.parent?.mediaKind ?? null);
  const audio = mediaKind === "AUDIO";
  const media = project.mediaUrl ? mediaSrc(project.mediaUrl) : "";
  const thumb = project.thumbnailUrl ? mediaSrc(project.thumbnailUrl) : "";
  const watchUrl = project.status === "PUBLISHED" ? `${mainOrigin()}/feed/videos/${project.id}` : null;
  const addHref = spec.showKind && project.showId ? `/projects/new?family=${spec.family}&shape=${spec.id}&show=${project.showId}` : null;

  return (
    <Shell name={ctx.creator.name} section="library">
      <div className="admin-pagehead">
        <div>
          <p className="admin-kicker">{spec.label}</p>
          <h1>{project.title || `Untitled ${spec.pieceNoun}`}</h1>
          <p>{project.show ? project.show.title : spec.detail}</p>
        </div>
        <ProjectMenu
          projectId={project.id}
          editHref={`/projects/${project.id}/edit`}
          watchHref={watchUrl}
          addHref={addHref}
          addLabel={addHref ? `Add another ${spec.pieceNoun}` : null}
          canHide={project.status === "PUBLISHED" || project.status === "SCHEDULED"}
        />
      </div>
      <p>
        <a href="/">Library</a>
      </p>
      {query.error ? <p className="admin-banner admin-banner--err">{query.error}</p> : null}
      {query.saved ? <p className="admin-banner admin-banner--ok">Saved.</p> : null}
      <div className="studio-detail">
        <div className={thumb || (media && !audio) ? "studio-detail__stage" : "studio-detail__stage studio-detail__stage--empty"}>
          {media && !audio ? (
            <video src={media} poster={thumb || undefined} controls playsInline />
          ) : thumb ? (
            <img src={thumb} alt="" />
          ) : (
            <span>{spec.label.slice(0, 1)}</span>
          )}
        </div>
        {audio && media ? <audio className="studio-detail__audio" src={media} controls /> : null}
        <section className="admin-section">
          <h2>About</h2>
          <p className="studio-detail__copy">{project.description || "No description yet."}</p>
          <dl className="admin-kv">
            <div>
              <dt>Status</dt>
              <dd>
                <span className={lozenge(project.status)}>{project.status.toLowerCase()}</span>
              </dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{spec.label}</dd>
            </div>
            {project.show ? (
              <div>
                <dt>Collection</dt>
                <dd>
                  <a href={`/shows/${project.show.id}`}>{project.show.title}</a>
                </dd>
              </div>
            ) : null}
            {project.parent ? (
              <div>
                <dt>Parent piece</dt>
                <dd>
                  <a href={`/projects/${project.parent.id}`}>{project.parent.title || "Untitled"}</a>
                </dd>
              </div>
            ) : null}
            <div>
              <dt>Language</dt>
              <dd>{labelOf(LANGUAGES, project.language)}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{project.category}</dd>
            </div>
            <div>
              <dt>Age suitability</dt>
              <dd>{labelOf(AGE_RATINGS, project.ageRating)}</dd>
            </div>
            <div>
              <dt>Who can play it</dt>
              <dd>{labelOf(AUDIENCES, project.audience)}</dd>
            </div>
            <div>
              <dt>Comments</dt>
              <dd>{project.commentsEnabled ? "Allowed" : "Off"}</dd>
            </div>
            <div>
              <dt>Home feed</dt>
              <dd>{project.pushToFeed ? "Also posted" : "Not posted"}</dd>
            </div>
          </dl>
        </section>
      </div>
    </Shell>
  );
}

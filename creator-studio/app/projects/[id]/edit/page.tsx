import { notFound } from "next/navigation";
import ClipEditor from "../../../../components/ClipEditor";
import DeleteProjectForm from "../../../../components/DeleteProjectForm";
import Gate from "../../../../components/Gate";
import Shell from "../../../../components/Shell";
import { saveProjectAction } from "../../../../lib/actions";
import { getStudioContext } from "../../../../lib/context";
import { AGE_RATINGS, AUDIENCES, CATEGORIES, LANGUAGES, mediaForShape, shapeById, shapeLabel } from "../../../../lib/labels";
import { mainOrigin } from "../../../../lib/media";
import { prisma } from "../../../../lib/prisma";
import { listAttachments } from "../../../../lib/store";

export const dynamic = "force-dynamic";

function localInput(date: Date | null) {
  if (!date) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function capitalize(value: string) {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
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
      show: { select: { id: true, title: true, kind: true } },
      parent: { select: { id: true, title: true, mediaKind: true } },
    },
  });
  if (!project) notFound();

  const spec = shapeById(project.shape);
  if (!spec) notFound();

  const [shows, parents, attachments] = await Promise.all([
    spec.showKind
      ? prisma.studioShow.findMany({
          where: { userId: ctx.user.id, kind: spec.showKind },
          orderBy: { title: "asc" },
          select: { id: true, title: true },
        })
      : Promise.resolve([]),
    spec.family === "PROMO"
      ? prisma.studioProject.findMany({
          where: { userId: ctx.user.id, family: { not: "PROMO" } },
          orderBy: { updatedAt: "desc" },
          select: { id: true, title: true, shape: true, mediaKind: true },
          take: 80,
        })
      : Promise.resolve([]),
    listAttachments(ctx.user.id, ctx.creator.id),
  ]);

  const parentKind = project.parent?.mediaKind ?? parents.find((parent) => parent.id === project.parentProjectId)?.mediaKind ?? null;
  const mediaKind = mediaForShape(spec, parentKind);
  const audio = mediaKind === "AUDIO";
  const attachmentValue =
    project.attachmentType === "NONE" || !project.attachmentId ? "NONE" : `${project.attachmentType}:${project.attachmentId}`;
  const watchUrl = `${mainOrigin()}/feed/videos/${project.id}`;
  const checks = [
    { label: `Title for this ${spec.pieceNoun}`, done: Boolean(project.title) },
    ...(spec.showKind ? [{ label: capitalize(spec.shelfNoun), done: Boolean(project.showId) }] : []),
    ...(spec.family === "PROMO" ? [{ label: "Parent piece", done: Boolean(project.parentProjectId) }] : []),
    { label: spec.fileLabel, done: Boolean(project.mediaUrl) },
    ...(audio ? [] : [{ label: "Thumbnail", done: Boolean(project.thumbnailUrl) }]),
    { label: "Rights", done: project.rightsConfirmed },
  ];

  return (
    <Shell name={ctx.creator.name} section="library">
      <div className="admin-pagehead">
        <div>
          <p className="admin-kicker">
            {spec.label} · {project.status.toLowerCase()}
          </p>
          <h1>{project.title || `Untitled ${spec.pieceNoun}`}</h1>
          <p>{spec.detail}</p>
        </div>
        <div className="admin-actions">
          {spec.showKind && project.showId ? (
            <a className="admin-btn admin-btn--subtle" href={`/projects/new?family=${spec.family}&shape=${spec.id}&show=${project.showId}`}>
              Add another {spec.pieceNoun}
            </a>
          ) : null}
          {project.status === "PUBLISHED" ? (
            <a className="admin-btn admin-btn--subtle" href={watchUrl}>
              View on Videos
            </a>
          ) : null}
        </div>
      </div>
      <p>
        <a href={`/projects/${project.id}`}>Project details</a>
      </p>
      {query.error ? <p className="admin-banner admin-banner--err">{query.error}</p> : null}
      {query.saved ? <p className="admin-banner admin-banner--ok">Saved.</p> : null}
      <div className="admin-issue">
      <form action={saveProjectAction}>
        <input type="hidden" name="id" value={project.id} />
        <input type="hidden" name="next" value="edit" />
        <section className="admin-section">
          <h2>Details</h2>
        {spec.showKind ? (
          <label className="admin-field">
            <span>{capitalize(spec.shelfNoun)}</span>
            <select name="showId" defaultValue={project.showId ?? ""} required>
              <option value="">Choose a {spec.shelfNoun}</option>
              {shows.map((show) => (
                <option key={show.id} value={show.id}>
                  {show.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {spec.family === "PROMO" ? (
          <label className="admin-field">
            <span>Parent piece</span>
            <select name="parentProjectId" defaultValue={project.parentProjectId ?? ""} required>
              <option value="">Choose a piece</option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {shapeLabel(parent.shape)} · {parent.title || "Untitled"}
                </option>
              ))}
            </select>
            <small>Save after changing the parent so the file upload matches that piece.</small>
          </label>
        ) : null}
        <label className="admin-field">
          <span>Title</span>
          <input type="text" name="title" defaultValue={project.title} maxLength={140} required />
        </label>
        <label className="admin-field">
          <span>Description</span>
          <textarea name="description" defaultValue={project.description} maxLength={5000} />
        </label>
        </section>
        <section className="admin-section">
          <h2>Media</h2>
        <ClipEditor
          kind={audio ? "audio" : "video"}
          label={spec.fileLabel}
          accept={audio ? "audio/mpeg,audio/mp4,audio/wav,audio/aac,.mp3,.m4a,.wav,.aac" : "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"}
          initialMedia={project.mediaUrl}
          initialThumb={project.thumbnailUrl}
          initialTrimStartMs={project.trimStartMs}
          initialTrimEndMs={project.trimEndMs}
          initialDurationMs={project.durationMs}
        />
        </section>
        <section className="admin-section">
          <h2>Audience</h2>
          <div className="studio-pair">
        <label className="admin-field">
          <span>Language</span>
          <select name="language" defaultValue={project.language}>
            {LANGUAGES.map((language) => (
              <option key={language.id} value={language.id}>
                {language.label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span>Category</span>
          <select name="category" defaultValue={project.category}>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span>Age suitability</span>
          <select name="ageRating" defaultValue={project.ageRating}>
            {AGE_RATINGS.map((rating) => (
              <option key={rating.id} value={rating.id}>
                {rating.label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span>Who can play it</span>
          <select name="audience" defaultValue={project.audience}>
            {AUDIENCES.map((audience) => (
              <option key={audience.id} value={audience.id}>
                {audience.label}
              </option>
            ))}
          </select>
        </label>
          </div>
        <label className="admin-field">
          <span>Publish at</span>
          <input type="datetime-local" name="publishAt" defaultValue={localInput(project.publishAt)} />
          <small>Leave this empty to publish now. A future time schedules it.</small>
        </label>
        <label className="admin-field">
          <span>Also link</span>
          <select name="attachment" defaultValue={attachmentValue}>
            <option value="NONE">Nothing</option>
            {attachments.products.map((product) => (
              <option key={product.id} value={`PRODUCT:${product.id}`}>
                Shop · {product.name}
              </option>
            ))}
            {attachments.requests.map((request) => (
              <option key={request.id} value={`REQUEST:${request.id}`}>
                Request · {request.label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-check">
          <input type="checkbox" name="pushToFeed" defaultChecked={project.pushToFeed} />
          Also send a copy to the home feed
        </label>
        <label className="admin-check">
          <input type="checkbox" name="commentsEnabled" defaultChecked={project.commentsEnabled} />
          Allow comments on the Videos page
        </label>
        <label className="admin-check">
          <input type="checkbox" name="rightsConfirmed" defaultChecked={project.rightsConfirmed} />
          I have the rights to publish this
        </label>
        </section>
        <div className="admin-actions">
          <button className="admin-btn admin-btn--subtle" type="submit" name="intent" value="save">
            Save
          </button>
          <button className="admin-btn" type="submit" name="intent" value="publish">
            Publish
          </button>
          <button className="admin-btn admin-btn--subtle" type="submit" name="intent" value="hide">
            Hide
          </button>
        </div>
      </form>
      <aside className="admin-side">
        <section className="admin-section">
          <h2>Ready to publish</h2>
          <dl className="admin-kv">
            {checks.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>
                  <span className={item.done ? "admin-lozenge admin-lozenge--success" : "admin-lozenge"}>{item.done ? "Ready" : "Needed"}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <DeleteProjectForm id={project.id} />
      </aside>
      </div>
    </Shell>
  );
}

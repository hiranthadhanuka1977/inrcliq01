import Gate from "../components/Gate";
import Shell from "../components/Shell";
import { getStudioContext } from "../lib/context";
import { shapeLabel } from "../lib/labels";
import { mediaSrc } from "../lib/media";
import { prisma } from "../lib/prisma";
import { releaseDueStudioProjects } from "../lib/store";

export const dynamic = "force-dynamic";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "DRAFT", label: "Drafts" },
  { id: "SCHEDULED", label: "Scheduled" },
  { id: "PUBLISHED", label: "Published" },
  { id: "HIDDEN", label: "Hidden" },
];

function lozenge(status: string) {
  if (status === "PUBLISHED") return "admin-lozenge admin-lozenge--success";
  if (status === "SCHEDULED") return "admin-lozenge admin-lozenge--warning";
  if (status === "HIDDEN") return "admin-lozenge";
  return "admin-lozenge admin-lozenge--info";
}

function libraryHref(status: string, view: "tiles" | "list") {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (view !== "tiles") params.set("view", view);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; view?: string }>;
}) {
  const ctx = await getStudioContext();
  if (ctx.kind === "signed-out") return <Gate />;
  if (ctx.kind === "blocked") return <Gate reason={ctx.reason} />;

  await releaseDueStudioProjects(ctx.user.id);
  const { status, view: viewParam } = await searchParams;
  const filter = status === "DRAFT" || status === "SCHEDULED" || status === "PUBLISHED" || status === "HIDDEN" ? status : "all";
  const view = viewParam === "list" ? "list" : "tiles";
  const projects = await prisma.studioProject.findMany({
    where: { userId: ctx.user.id, ...(filter === "all" ? {} : { status: filter }) },
    orderBy: { updatedAt: "desc" },
    include: { show: { select: { title: true } } },
  });

  return (
    <Shell name={ctx.creator.name} section="library">
      <div className="admin-pagehead">
        <div>
          <p className="admin-kicker">Library</p>
          <h1>Your projects</h1>
          <p>Shorts, films, shows, books, music, sound, and promos. Publish a piece to Videos when it is ready.</p>
        </div>
        <a className="admin-btn" href="/projects/new">
          New project
        </a>
      </div>
      <div className="studio-library-bar">
        <div className="admin-stats">
          {FILTERS.map((item) => (
            <a key={item.id} className={filter === item.id ? "admin-stat is-active" : "admin-stat"} href={libraryHref(item.id, view)}>
              {item.label}
            </a>
          ))}
        </div>
        <div className="studio-view" role="group" aria-label="Library layout">
          <a className={view === "tiles" ? "is-active" : undefined} href={libraryHref(filter, "tiles")} aria-current={view === "tiles" ? "true" : undefined}>
            Tiles
          </a>
          <a className={view === "list" ? "is-active" : undefined} href={libraryHref(filter, "list")} aria-current={view === "list" ? "true" : undefined}>
            List
          </a>
        </div>
      </div>
      {projects.length === 0 ? (
        <div className="admin-panel">
          <p className="admin-empty">Nothing in this view yet. Start a project and the studio will ask only for what that type needs.</p>
        </div>
      ) : view === "tiles" ? (
        <div className="studio-library">
          {projects.map((project) => (
            <a key={project.id} className="studio-card" href={`/projects/${project.id}`}>
              <span className="studio-card__media">
                {project.thumbnailUrl ? <img src={mediaSrc(project.thumbnailUrl)} alt="" /> : shapeLabel(project.shape).slice(0, 1)}
              </span>
              <span className="studio-card__body">
                <strong>{project.title || "Untitled"}</strong>
                <span className="admin-meta">
                  {shapeLabel(project.shape)}
                  {project.show ? ` · ${project.show.title}` : ""}
                  {project.mediaUrl ? "" : " · Needs a file"}
                </span>
                <span className={lozenge(project.status)}>{project.status.toLowerCase()}</span>
              </span>
            </a>
          ))}
        </div>
      ) : (
        <div className="admin-panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <a href={`/projects/${project.id}`}>
                      {project.thumbnailUrl ? (
                        <img className="studio-row-thumb" src={mediaSrc(project.thumbnailUrl)} alt="" />
                      ) : null}
                      {project.title || "Untitled"}
                      <small className="admin-meta">
                        {project.show ? project.show.title : "Standalone"}
                        {project.mediaUrl ? "" : " · Needs a file"}
                      </small>
                    </a>
                  </td>
                  <td>{shapeLabel(project.shape)}</td>
                  <td>
                    <span className={lozenge(project.status)}>{project.status.toLowerCase()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}

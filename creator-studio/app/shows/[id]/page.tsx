import { notFound } from "next/navigation";
import CollectionMenu from "../../../components/CollectionMenu";
import Gate from "../../../components/Gate";
import Shell from "../../../components/Shell";
import { getStudioContext } from "../../../lib/context";
import { SHAPES, shapeLabel, showKindLabel } from "../../../lib/labels";
import { mediaSrc } from "../../../lib/media";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

function lozenge(status: string) {
  if (status === "PUBLISHED") return "admin-lozenge admin-lozenge--success";
  if (status === "SCHEDULED") return "admin-lozenge admin-lozenge--warning";
  if (status === "HIDDEN") return "admin-lozenge";
  return "admin-lozenge admin-lozenge--info";
}

function listTitle(noun: string) {
  const label = noun.charAt(0).toUpperCase() + noun.slice(1);
  return label.endsWith("s") ? label : `${label}s`;
}

export default async function ShowPage({
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
  const show = await prisma.studioShow.findFirst({
    where: { id, userId: ctx.user.id },
    include: {
      projects: {
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, status: true, shape: true },
      },
    },
  });
  if (!show) notFound();

  const shape = SHAPES.find((item) => item.showKind === show.kind);
  const pieceNoun = shape?.pieceNoun ?? "piece";
  const addHref = shape ? `/projects/new?family=${shape.family}&shape=${shape.id}&show=${show.id}` : null;
  const cover = show.coverUrl ? mediaSrc(show.coverUrl) : "";

  return (
    <Shell name={ctx.creator.name} section="collections">
      <div className="admin-pagehead">
        <div>
          <p className="admin-kicker">{showKindLabel(show.kind)}</p>
          <h1>{show.title}</h1>
          <p>
            {show.projects.length} {show.projects.length === 1 ? pieceNoun : listTitle(pieceNoun).toLowerCase()}
          </p>
        </div>
        <CollectionMenu editHref={`/shows/${show.id}/edit`} addHref={addHref} addLabel={addHref ? `Add ${pieceNoun === "episode" ? "an" : "a"} ${pieceNoun}` : null} />
      </div>
      <p>
        <a href="/shows">All collections</a>
      </p>
      {query.error ? <p className="admin-banner admin-banner--err">{query.error}</p> : null}
      {query.saved ? <p className="admin-banner admin-banner--ok">Saved.</p> : null}
      <div className="studio-detail">
        <div className={cover ? "studio-detail__stage" : "studio-detail__stage studio-detail__stage--empty"}>
          {cover ? <img src={cover} alt="" /> : <span>{showKindLabel(show.kind).slice(0, 1)}</span>}
        </div>
        <section className="admin-section">
          <h2>About</h2>
          <p className="studio-detail__copy">{show.description || "No description yet."}</p>
        </section>
        <section className="admin-section">
          <h2>{listTitle(pieceNoun)}</h2>
          {show.projects.length === 0 ? (
            <p className="admin-empty">No {listTitle(pieceNoun).toLowerCase()} yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{listTitle(pieceNoun).replace(/s$/, "")}</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {show.projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <a href={`/projects/${project.id}`}>{project.title || "Untitled"}</a>
                    </td>
                    <td>{shapeLabel(project.shape)}</td>
                    <td>
                      <span className={lozenge(project.status)}>{project.status.toLowerCase()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </Shell>
  );
}

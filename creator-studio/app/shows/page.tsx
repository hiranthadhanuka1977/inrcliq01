import Gate from "../../components/Gate";
import Shell from "../../components/Shell";
import { getStudioContext } from "../../lib/context";
import { SHOW_KINDS, showKindLabel } from "../../lib/labels";
import { mediaSrc } from "../../lib/media";
import { prisma } from "../../lib/prisma";

export const dynamic = "force-dynamic";

const FILTERS = [{ id: "all", label: "All" }, ...SHOW_KINDS.map((kind) => ({ id: kind.id, label: kind.label }))];

function collectionsHref(kind: string, view: "tiles" | "list") {
  const params = new URLSearchParams();
  if (kind !== "all") params.set("kind", kind);
  if (view !== "tiles") params.set("view", view);
  const query = params.toString();
  return query ? `/shows?${query}` : "/shows";
}

function pieceCount(count: number) {
  return count === 1 ? "1 piece" : `${count} pieces`;
}

export default async function ShowsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; view?: string; error?: string; saved?: string }>;
}) {
  const ctx = await getStudioContext();
  if (ctx.kind === "signed-out") return <Gate />;
  if (ctx.kind === "blocked") return <Gate reason={ctx.reason} />;

  const query = await searchParams;
  const kind = SHOW_KINDS.some((item) => item.id === query.kind) ? query.kind! : "all";
  const view = query.view === "list" ? "list" : "tiles";
  const shows = await prisma.studioShow.findMany({
    where: { userId: ctx.user.id, ...(kind === "all" ? {} : { kind: kind as (typeof SHOW_KINDS)[number]["id"] }) },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { projects: true } } },
  });

  return (
    <Shell name={ctx.creator.name} section="collections">
      <div className="admin-pagehead">
        <div>
          <p className="admin-kicker">Collections</p>
          <h1>Series, shows, and albums</h1>
          <p>A series, podcast, book series, EP, or album holds the pieces you add to it.</p>
        </div>
        <a className="admin-btn" href="/shows/new">
          New collection
        </a>
      </div>
      {query.error ? <p className="admin-banner admin-banner--err">{query.error}</p> : null}
      {query.saved ? <p className="admin-banner admin-banner--ok">Saved.</p> : null}
      <div className="studio-library-bar">
        <div className="admin-stats">
          {FILTERS.map((item) => (
            <a key={item.id} className={kind === item.id ? "admin-stat is-active" : "admin-stat"} href={collectionsHref(item.id, view)}>
              {item.label}
            </a>
          ))}
        </div>
        <div className="studio-view" role="group" aria-label="Collections layout">
          <a className={view === "tiles" ? "is-active" : undefined} href={collectionsHref(kind, "tiles")} aria-current={view === "tiles" ? "true" : undefined}>
            Tiles
          </a>
          <a className={view === "list" ? "is-active" : undefined} href={collectionsHref(kind, "list")} aria-current={view === "list" ? "true" : undefined}>
            List
          </a>
        </div>
      </div>
      {shows.length === 0 ? (
        <div className="admin-panel">
          <p className="admin-empty">No collections in this view yet. Create one, then add pieces to it.</p>
        </div>
      ) : view === "tiles" ? (
        <div className="studio-library">
          {shows.map((show) => (
            <a key={show.id} className="studio-card" href={`/shows/${show.id}`}>
              <span className="studio-card__media">
                {show.coverUrl ? <img src={mediaSrc(show.coverUrl)} alt="" /> : showKindLabel(show.kind).slice(0, 1)}
              </span>
              <span className="studio-card__body">
                <strong>{show.title}</strong>
                <span className="admin-meta">
                  {showKindLabel(show.kind)} · {pieceCount(show._count.projects)}
                </span>
              </span>
            </a>
          ))}
        </div>
      ) : (
        <div className="admin-panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Collection</th>
                <th>Type</th>
                <th>Pieces</th>
              </tr>
            </thead>
            <tbody>
              {shows.map((show) => (
                <tr key={show.id}>
                  <td>
                    <a href={`/shows/${show.id}`}>
                      {show.coverUrl ? <img className="studio-row-thumb" src={mediaSrc(show.coverUrl)} alt="" /> : null}
                      {show.title}
                    </a>
                  </td>
                  <td>{showKindLabel(show.kind)}</td>
                  <td>{show._count.projects}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}

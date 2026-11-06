import { redirect } from "next/navigation";
import FamilyIllustration from "../../../components/FamilyIllustration";
import Gate from "../../../components/Gate";
import Shell from "../../../components/Shell";
import { startProjectAction } from "../../../lib/actions";
import { getStudioContext } from "../../../lib/context";
import { FAMILIES, creationSteps, familyById, shapeLabel, shapesFor } from "../../../lib/labels";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

function titleCase(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ family?: string; shape?: string; show?: string; error?: string }>;
}) {
  const ctx = await getStudioContext();
  if (ctx.kind === "signed-out") return <Gate />;
  if (ctx.kind === "blocked") return <Gate reason={ctx.reason} />;

  const query = await searchParams;
  const family = familyById(query.family ?? "");
  const shapes = family ? shapesFor(family.id) : [];
  const shape = shapes.find((item) => item.id === query.shape);

  if (query.family && !family) redirect("/projects/new");
  if (query.shape && !shape) redirect(family ? `/projects/new?family=${family.id}` : "/projects/new");

  const shows = shape?.showKind
    ? await prisma.studioShow.findMany({
        where: { userId: ctx.user.id, kind: shape.showKind },
        orderBy: { title: "asc" },
        select: { id: true, title: true },
      })
    : [];
  const parents =
    shape?.family === "PROMO"
      ? await prisma.studioProject.findMany({
          where: { userId: ctx.user.id, family: { not: "PROMO" } },
          orderBy: { updatedAt: "desc" },
          select: { id: true, title: true, shape: true },
          take: 80,
        })
      : [];
  const selectedShow = shows.some((show) => show.id === query.show) ? query.show : shows[0]?.id;
  const lockedShow = shows.find((show) => show.id === query.show) ?? null;

  return (
    <Shell name={ctx.creator.name} section="create">
      {!family ? (
        <>
          <div className="admin-pagehead">
            <div>
              <p className="admin-kicker">Step 1 · Type</p>
              <h1>What are you making?</h1>
              <p>Pick a type. The next step asks only for what that type needs.</p>
            </div>
          </div>
          {query.error ? <p className="admin-banner admin-banner--err">{query.error}</p> : null}
          <div className="admin-tiles admin-tiles--types">
            {FAMILIES.map((item) => (
              <a key={item.id} className="admin-tile admin-tile--type" href={`/projects/new?family=${item.id}`}>
                <span className="admin-tile__art">
                  <FamilyIllustration id={item.id} />
                </span>
                <span className="admin-tile__label">{item.label}</span>
                <span className="admin-tile__detail">{item.detail}</span>
              </a>
            ))}
          </div>
        </>
      ) : null}

      {family && !shape ? (
        <>
          <div className="admin-pagehead">
            <div>
              <p className="admin-kicker">Step 2 · {family.label}</p>
              <h1>{family.label}</h1>
              <p>{family.detail}</p>
            </div>
          </div>
          <p>
            <a href="/projects/new">All types</a>
          </p>
          <div className="admin-tiles admin-tiles--types">
            {shapes.map((item) => (
              <a key={item.id} className="admin-tile" href={`/projects/new?family=${family.id}&shape=${item.id}`}>
                <span className="admin-tile__label">{item.label}</span>
                <span className="admin-tile__detail">{item.detail}</span>
              </a>
            ))}
          </div>
        </>
      ) : null}

      {family && shape ? (
        <>
          <div className="admin-pagehead">
            <div>
              <p className="admin-kicker">Step 3 · {shape.label}</p>
              <h1>{shape.label}</h1>
              <p>{shape.detail}</p>
            </div>
          </div>
          <p>
            <a href={`/projects/new?family=${family.id}`}>Other {family.label.toLowerCase()} options</a>
          </p>
          {query.error ? <p className="admin-banner admin-banner--err">{query.error}</p> : null}
          <ol className="studio-steps">
            {creationSteps(shape).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {shape.family === "PROMO" && parents.length === 0 ? (
            <p className="admin-banner admin-banner--warn">Create the film, episode, show, book, or track first. A promo has to point at that piece.</p>
          ) : (
            <form className="admin-section" action={startProjectAction}>
              <input type="hidden" name="family" value={family.id} />
              <input type="hidden" name="shape" value={shape.id} />
              {shape.showKind ? (
                lockedShow ? (
                  <>
                    <p className="admin-meta">Adding to {lockedShow.title}</p>
                    <input type="hidden" name="showChoice" value={lockedShow.id} />
                  </>
                ) : shows.length === 0 ? (
                  <>
                    <input type="hidden" name="showChoice" value="new" />
                    <label className="admin-field">
                      <span>{titleCase(shape.shelfNoun)} title</span>
                      <input type="text" name="showTitle" maxLength={140} required />
                    </label>
                  </>
                ) : (
                  <fieldset className="studio-options">
                    <legend>Which {shape.shelfNoun}?</legend>
                    {shows.map((show) => (
                      <label key={show.id}>
                        <input type="radio" name="showChoice" value={show.id} defaultChecked={show.id === selectedShow} required />
                        <span>{show.title}</span>
                      </label>
                    ))}
                    <label>
                      <input type="radio" name="showChoice" value="new" required />
                      <span>New {shape.shelfNoun}</span>
                    </label>
                    <label className="admin-field">
                      <span>New {titleCase(shape.shelfNoun)} title</span>
                      <input type="text" name="showTitle" maxLength={140} />
                    </label>
                  </fieldset>
                )
              ) : null}
              {shape.family === "PROMO" ? (
                <label className="admin-field">
                  <span>Parent piece</span>
                  <select name="parentProjectId" required defaultValue="">
                    <option value="" disabled>
                      Choose a piece
                    </option>
                    {parents.map((parent) => (
                      <option key={parent.id} value={parent.id}>
                        {shapeLabel(parent.shape)} · {parent.title || "Untitled"}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="admin-field">
                <span>{titleCase(shape.pieceNoun)} title</span>
                <input type="text" name="title" maxLength={140} required />
              </label>
              <div>
                <button className="admin-btn" type="submit">
                  Continue
                </button>
              </div>
            </form>
          )}
        </>
      ) : null}
    </Shell>
  );
}

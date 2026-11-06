import { notFound } from "next/navigation";
import Gate from "../../../../components/Gate";
import Shell from "../../../../components/Shell";
import Uploader from "../../../../components/Uploader";
import { updateShowAction } from "../../../../lib/actions";
import { getStudioContext } from "../../../../lib/context";
import { showKindLabel } from "../../../../lib/labels";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditShowPage({
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
  });
  if (!show) notFound();

  return (
    <Shell name={ctx.creator.name} section="collections">
      <div className="admin-pagehead">
        <div>
          <p className="admin-kicker">{showKindLabel(show.kind)}</p>
          <h1>{show.title}</h1>
          <p>Update the title, description, and cover.</p>
        </div>
      </div>
      <p>
        <a href={`/shows/${show.id}`}>Collection details</a>
      </p>
      {query.error ? <p className="admin-banner admin-banner--err">{query.error}</p> : null}
      {query.saved ? <p className="admin-banner admin-banner--ok">Saved.</p> : null}
      <form className="admin-section" action={updateShowAction}>
        <input type="hidden" name="id" value={show.id} />
        <h2>Details</h2>
        <label className="admin-field">
          <span>Title</span>
          <input type="text" name="title" defaultValue={show.title} maxLength={140} required />
        </label>
        <label className="admin-field">
          <span>Description</span>
          <textarea name="description" defaultValue={show.description} maxLength={2000} />
        </label>
        <Uploader name="coverUrl" kind="image" label="Cover image" accept="image/jpeg,image/png,image/webp" initial={show.coverUrl} />
        <div>
          <button className="admin-btn" type="submit">
            Save collection
          </button>
        </div>
      </form>
    </Shell>
  );
}

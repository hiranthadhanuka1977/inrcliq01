import Gate from "../../../components/Gate";
import Shell from "../../../components/Shell";
import Uploader from "../../../components/Uploader";
import { createShowAction } from "../../../lib/actions";
import { getStudioContext } from "../../../lib/context";
import { SHOW_KINDS } from "../../../lib/labels";

export const dynamic = "force-dynamic";

export default async function NewShowPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await getStudioContext();
  if (ctx.kind === "signed-out") return <Gate />;
  if (ctx.kind === "blocked") return <Gate reason={ctx.reason} />;
  const query = await searchParams;

  return (
    <Shell name={ctx.creator.name} section="collections">
      <div className="admin-pagehead">
        <div>
          <p className="admin-kicker">Collections</p>
          <h1>New collection</h1>
          <p>Name the series, show, book series, EP, or album. Pieces are added after it exists.</p>
        </div>
      </div>
      <p>
        <a href="/shows">All collections</a>
      </p>
      {query.error ? <p className="admin-banner admin-banner--err">{query.error}</p> : null}
      <form className="admin-section" action={createShowAction}>
        <label className="admin-field">
          <span>Title</span>
          <input type="text" name="title" maxLength={140} required />
        </label>
        <label className="admin-field">
          <span>Type</span>
          <select name="kind" defaultValue="PODCAST">
            {SHOW_KINDS.map((kind) => (
              <option key={kind.id} value={kind.id}>
                {kind.label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span>Description</span>
          <textarea name="description" maxLength={2000} />
        </label>
        <Uploader name="coverUrl" kind="image" label="Cover image" accept="image/jpeg,image/png,image/webp" initial={null} />
        <div>
          <button className="admin-btn" type="submit">
            Create collection
          </button>
        </div>
      </form>
    </Shell>
  );
}

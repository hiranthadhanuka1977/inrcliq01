export function AdminPlaceholder({ kicker, title, summary }: { kicker: string; title: string; summary: string }) {
  return (
    <>
      <div className="admin-pagehead">
        <div>
          <p className="admin-kicker">{kicker}</p>
          <h1>{title}</h1>
          <p>{summary}</p>
        </div>
      </div>
      <section className="admin-panel" aria-label={title}>
        <p className="admin-empty">Nothing here yet.</p>
      </section>
    </>
  );
}

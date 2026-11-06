import { mainOrigin } from "../lib/media";

export default function Shell({
  name,
  section = "library",
  children,
}: {
  name?: string;
  section?: "library" | "collections" | "create";
  children: React.ReactNode;
}) {
  const home = mainOrigin();
  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/">
          <span className="admin-brand__mark">Iq</span>
          <span>
            InrCliq
            <small>Studio</small>
          </span>
        </a>
        <nav className="admin-nav" aria-label="Creator Studio">
          <a className={section === "library" ? "is-active" : undefined} href="/" aria-current={section === "library" ? "page" : undefined}>
            Library
          </a>
          <a
            className={section === "collections" ? "is-active" : undefined}
            href="/shows"
            aria-current={section === "collections" ? "page" : undefined}
          >
            Collections
          </a>
          <a className={section === "create" ? "is-active" : undefined} href="/projects/new" aria-current={section === "create" ? "page" : undefined}>
            New project
          </a>
        </nav>
        <div className="admin-sidebar__foot">
          {name ? <div>{name}</div> : null}
          <form action="/api/logout" method="post">
            <button type="submit">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <span className="admin-switcher__label">Creator Studio</span>
          <a className="admin-btn admin-btn--subtle admin-topbar__link" href={`${home}/feed`}>
            Open InrCliq
          </a>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}

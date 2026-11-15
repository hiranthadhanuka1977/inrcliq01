import { mainOrigin } from "../lib/main";
import ProNav from "./ProNav";

export default function Shell({
  name,
  children,
}: {
  name?: string;
  children: React.ReactNode;
}) {
  const home = mainOrigin();
  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/seller-pro">
          <span className="admin-brand__mark">Iq</span>
          <span>
            InrCliq
            <small>Advanced</small>
          </span>
        </a>
        <ProNav />
        <div className="admin-sidebar__foot">
          {name ? <div>{name}</div> : null}
          <form action="/api/logout" method="post">
            <button type="submit">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <span className="admin-switcher__label">Seller Tools</span>
          <a className="admin-btn admin-btn--subtle admin-topbar__link" href={`${home}/seller`}>
            Open InrCliq
          </a>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}

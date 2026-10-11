import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminTopSearch } from "@/components/admin/AdminTopSearch";

export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand__mark">Iq</span>
          <span>
            InrCliq
            <small>Admin</small>
          </span>
        </div>
        <AdminNav />
        <div className="admin-sidebar__foot">
          Shared admin password. Access lasts 8 hours.
          <AdminLogoutButton />
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <strong>Users</strong>
          <AdminTopSearch />
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { AdminFilterBar, AdminPager, AdminUserTable } from "@/components/admin/admin-ui";
import { adminQueryString, listAdminUsers, parseAdminFilters, type AdminListFilters } from "@/lib/admin-portal/queue";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function AdminDirectoryPage({ searchParams }: PageProps) {
  const filters = parseAdminFilters(await searchParams);
  const result = await listAdminUsers("directory", filters);

  return (
    <>
      <div className="admin-pagehead">
        <div>
          <p className="admin-kicker">Users</p>
          <h1>Directory</h1>
          <p>Adults, minors, and guardians. Account type is shown separately from age zone.</p>
        </div>
        <Link className="admin-btn admin-btn--subtle" href={exportHref(filters)}>
          Export CSV
        </Link>
      </div>
      <AdminFilterBar basePath="/admin/users" filters={filters} />
      <AdminUserTable rows={result.rows} />
      <AdminPager basePath="/admin/users" filters={filters} page={result.page} pageCount={result.pageCount} total={result.total} />
    </>
  );
}

function exportHref(filters: AdminListFilters) {
  const query = adminQueryString(filters);
  return `/api/admin-portal/export?kind=directory${query ? `&${query.slice(1)}` : ""}`;
}

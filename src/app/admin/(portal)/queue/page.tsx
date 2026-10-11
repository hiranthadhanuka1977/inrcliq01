import Link from "next/link";
import { AdminFilterBar, AdminPager, AdminUserTable } from "@/components/admin/admin-ui";
import { adminQueryString, listAdminUsers, parseAdminFilters, type AdminListFilters } from "@/lib/admin-portal/queue";
import { STUCK_LABELS, STUCK_REASONS } from "@/lib/admin-portal/stuck";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function AdminQueuePage({ searchParams }: PageProps) {
  const filters = parseAdminFilters(await searchParams);
  const result = await listAdminUsers("queue", filters);
  const actionable =
    result.counts.invite_expired + result.counts.declined + result.counts.continue_expired;

  return (
    <>
      <div className="admin-pagehead">
        <div>
          <p className="admin-kicker">Onboarding</p>
          <h1>Queue</h1>
          <p>Accounts that have not finished setup, suspended accounts, and completions from the last 7 days.</p>
        </div>
        <Link className="admin-btn admin-btn--subtle" href={exportHref("queue", filters)}>
          Export CSV
        </Link>
      </div>
      <p className="admin-lead" style={{ marginTop: -8, marginBottom: 12 }}>
        {actionable} {actionable === 1 ? "minor needs" : "minors need"} help before they can continue: expired invite, declined with no new invite, or an expired continue link.
      </p>
      <div className="admin-stats">
        {STUCK_REASONS.map((reason) => (
          <Link
            key={reason}
            className={`admin-stat${filters.stuck === reason ? " is-active" : ""}`}
            href={`/admin/queue${adminQueryString(filters, { stuck: filters.stuck === reason ? "" : reason, page: 1 })}`}
          >
            <strong>{result.counts[reason]}</strong>
            {STUCK_LABELS[reason]}
          </Link>
        ))}
      </div>
      <AdminFilterBar basePath="/admin/queue" filters={filters} showStuck />
      <AdminUserTable rows={result.rows} />
      <AdminPager basePath="/admin/queue" filters={filters} page={result.page} pageCount={result.pageCount} total={result.total} />
    </>
  );
}

function exportHref(kind: string, filters: AdminListFilters) {
  const query = adminQueryString(filters);
  return `/api/admin-portal/export?kind=${kind}${query ? `&${query.slice(1)}` : ""}`;
}

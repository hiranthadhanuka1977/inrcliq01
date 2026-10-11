import Link from "next/link";
import type { AccountType } from "@/generated/prisma/client";
import type { AdminListFilters, AdminListRow } from "@/lib/admin-portal/queue";
import { adminQueryString } from "@/lib/admin-portal/queue";
import { STUCK_LABELS, STUCK_REASONS, type StuckReason } from "@/lib/admin-portal/stuck";

export function lozengeClass(stuck: StuckReason | null, approval?: string | null) {
  if (stuck === "suspended" || stuck === "declined" || stuck === "invite_expired" || stuck === "continue_expired") {
    return "admin-lozenge admin-lozenge--danger";
  }
  if (stuck === "approved_waiting" || stuck === "setup_incomplete" || stuck === "needs_guardian_email") {
    return "admin-lozenge admin-lozenge--warning";
  }
  if (stuck === "invite_open" || stuck === "email_unverified") return "admin-lozenge admin-lozenge--info";
  if (stuck === "recent_complete" || approval === "APPROVED") return "admin-lozenge admin-lozenge--success";
  if (approval === "DECLINED" || approval === "REVOKED" || approval === "EXPIRED") {
    return "admin-lozenge admin-lozenge--danger";
  }
  if (approval === "PENDING") return "admin-lozenge admin-lozenge--info";
  return "admin-lozenge";
}

export function accountLozenge(accountType: AccountType) {
  if (accountType === "MINOR") return "admin-lozenge admin-lozenge--warning";
  if (accountType === "GUARDIAN") return "admin-lozenge admin-lozenge--info";
  return "admin-lozenge";
}

const STEPS = ["", "parent", "waiting", "approved", "password", "handle", "interests", "complete", "guardian-setup"];

export function AdminFilterBar({
  basePath,
  filters,
  showStuck,
}: {
  basePath: string;
  filters: AdminListFilters;
  showStuck?: boolean;
}) {
  return (
    <form className="admin-filters" action={basePath} method="get">
      <label>
        Search
        <input name="q" defaultValue={filters.q ?? ""} placeholder="Name, email, handle" />
      </label>
      <label>
        Account
        <select name="accountType" defaultValue={filters.accountType ?? ""}>
          <option value="">All</option>
          <option value="ADULT">Adult</option>
          <option value="MINOR">Minor</option>
          <option value="GUARDIAN">Guardian</option>
        </select>
      </label>
      <label>
        Age zone
        <select name="ageZone" defaultValue={filters.ageZone ?? ""}>
          <option value="">All</option>
          <option value="KIDS">Kids</option>
          <option value="TEENS">Teens</option>
          <option value="MATURE_TEENS">Mature teens</option>
          <option value="ADULT">Adult</option>
        </select>
      </label>
      <label>
        Step
        <select name="step" defaultValue={filters.step ?? ""}>
          {STEPS.map((step) => (
            <option key={step || "all"} value={step}>
              {step || "All"}
            </option>
          ))}
        </select>
      </label>
      <label>
        Approval
        <select name="approval" defaultValue={filters.approval ?? ""}>
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="DECLINED">Declined</option>
          <option value="EXPIRED">Expired</option>
          <option value="none">No request</option>
        </select>
      </label>
      {showStuck ? (
        <label>
          Stuck
          <select name="stuck" defaultValue={filters.stuck ?? ""}>
            <option value="">All</option>
            {STUCK_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {STUCK_LABELS[reason]}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label>
        Group
        <select name="group" defaultValue={filters.group ?? ""}>
          <option value="">All</option>
          <option value="members">Members</option>
          <option value="demo">Demo</option>
          <option value="ai">AI</option>
        </select>
      </label>
      <button className="admin-btn" type="submit">
        Apply
      </button>
      <Link className="admin-btn admin-btn--subtle" href={basePath}>
        Clear
      </Link>
    </form>
  );
}

export function AdminUserTable({ rows }: { rows: AdminListRow[] }) {
  if (!rows.length) return <p className="admin-empty">No accounts match these filters.</p>;

  return (
    <div className="admin-panel">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Person</th>
            <th>Type</th>
            <th>Step</th>
            <th>Blocker</th>
            <th>Guardian</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="admin-person">
                <Link href={`/admin/users/${row.id}`}>{row.name}</Link>
                <small>
                  {row.email}
                  {row.handle ? ` · ${row.handle}` : ""} · {row.group}
                </small>
              </td>
              <td>
                <span className={accountLozenge(row.accountType)}>{row.accountType}</span>
                <small className="admin-meta">{row.ageZoneLabel}</small>
              </td>
              <td>{row.stepLabel}</td>
              <td>
                {row.stuck ? <span className={lozengeClass(row.stuck)}>{STUCK_LABELS[row.stuck]}</span> : "—"}
                <small className="admin-meta">{row.detail}</small>
              </td>
              <td>{row.guardianEmail ?? "—"}</td>
              <td>{row.createdAt.toISOString().slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminPager({
  basePath,
  filters,
  page,
  pageCount,
  total,
}: {
  basePath: string;
  filters: AdminListFilters;
  page: number;
  pageCount: number;
  total: number;
}) {
  return (
    <div className="admin-pager">
      <span>
        {total} {total === 1 ? "account" : "accounts"} · page {page} of {pageCount}
      </span>
      <div>
        {page > 1 ? (
          <Link className="admin-btn admin-btn--subtle" href={`${basePath}${adminQueryString(filters, { page: page - 1 })}`}>
            Previous
          </Link>
        ) : null}
        {page < pageCount ? (
          <Link className="admin-btn admin-btn--subtle" href={`${basePath}${adminQueryString(filters, { page: page + 1 })}`}>
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}

import Link from "next/link";
import { listConsentRegister } from "@/lib/admin-portal/lists";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ from?: string; to?: string }> };

export default async function AdminConsentPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const from = parseDay(params.from, false);
  const to = parseDay(params.to, true);
  const rows = await listConsentRegister(from ?? undefined, to ?? undefined);
  const exportQuery = new URLSearchParams();
  if (params.from) exportQuery.set("from", params.from);
  if (params.to) exportQuery.set("to", params.to);

  return (
    <>
      <div className="admin-pagehead">
        <div>
          <p className="admin-kicker">Compliance</p>
          <h1>Consent register</h1>
          <p>Approved minors whose guardian link is still active. This is the consent evidence for parent approval.</p>
        </div>
        <Link className="admin-btn admin-btn--subtle" href={`/api/admin-portal/export?kind=consent&${exportQuery.toString()}`}>
          Export CSV
        </Link>
      </div>
      <form className="admin-filters" action="/admin/consent" method="get">
        <label>
          From
          <input type="date" name="from" defaultValue={params.from ?? ""} />
        </label>
        <label>
          To
          <input type="date" name="to" defaultValue={params.to ?? ""} />
        </label>
        <button className="admin-btn" type="submit">
          Apply
        </button>
        <Link className="admin-btn admin-btn--subtle" href="/admin/consent">
          Clear
        </Link>
      </form>
      <div className="admin-panel">
        {rows.length ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Child</th>
                <th>Guardian</th>
                <th>Decided</th>
                <th>Protection</th>
                <th>Identity captured</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.childId}-${row.decidedAt}-${row.guardianEmail}`}>
                  <td className="admin-person">
                    <Link href={`/admin/users/${row.childId}`}>{row.childName}</Link>
                    <small>{row.childEmail}</small>
                  </td>
                  <td className="admin-person">
                    {row.guardianId ? <Link href={`/admin/users/${row.guardianId}`}>{row.guardianName}</Link> : row.guardianName}
                    <small>{row.guardianEmail}</small>
                  </td>
                  <td>{row.decidedAt}</td>
                  <td>{row.protectionLevel}</td>
                  <td>
                    {row.idDocType}
                    <small className="admin-meta">
                      {row.childLocation} · lives with guardian {row.livesWithGuardian}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="admin-empty">No active approvals in this date range.</p>
        )}
      </div>
    </>
  );
}

function parseDay(value: string | undefined, endOfDay: boolean) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

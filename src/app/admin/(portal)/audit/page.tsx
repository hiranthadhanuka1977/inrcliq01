import Link from "next/link";
import { listAdminAudit } from "@/lib/admin-portal/audit";

export const dynamic = "force-dynamic";

function summarize(value: unknown) {
  if (!value || typeof value !== "object") return "—";
  const entries = Object.entries(value as Record<string, unknown>).slice(0, 4);
  if (!entries.length) return "—";
  return entries.map(([key, item]) => `${key}: ${String(item)}`).join(" · ");
}

export default async function AdminAuditPage() {
  const entries = await listAdminAudit({ take: 200 });

  return (
    <>
      <div className="admin-pagehead">
        <div>
          <p className="admin-kicker">Compliance</p>
          <h1>Audit log</h1>
          <p>Operator changes in this portal. The actor is the shared admin sign-in. Tokens are not stored.</p>
        </div>
      </div>
      <div className="admin-panel">
        {entries.length ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>User</th>
                <th>Reason</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const email = entry.targetUser?.email ?? emailFrom(entry.before);
                const userId = entry.targetUser?.id;
                return (
                  <tr key={entry.id}>
                    <td>{entry.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</td>
                    <td>{entry.action}</td>
                    <td>
                      {userId ? <Link href={`/admin/users/${userId}`}>{email}</Link> : email}
                    </td>
                    <td>{entry.reason}</td>
                    <td>
                      <small className="admin-meta">Before {summarize(entry.before)}</small>
                      <small className="admin-meta">After {summarize(entry.after)}</small>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="admin-empty">No operator actions yet.</p>
        )}
      </div>
    </>
  );
}

function emailFrom(value: unknown) {
  if (!value || typeof value !== "object" || !("email" in value)) return "Deleted account";
  const email = (value as { email?: unknown }).email;
  return typeof email === "string" ? email : "Deleted account";
}

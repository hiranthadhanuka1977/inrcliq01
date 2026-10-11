import Link from "next/link";
import { lozengeClass } from "@/components/admin/admin-ui";
import { listAdminGuardians } from "@/lib/admin-portal/lists";

export const dynamic = "force-dynamic";

export default async function AdminGuardiansPage() {
  const guardians = await listAdminGuardians();

  return (
    <>
      <div className="admin-pagehead">
        <div>
          <p className="admin-kicker">Family</p>
          <h1>Guardians</h1>
          <p>Completed guardians can skip identity capture when they approve another child. Rejected identity cannot.</p>
        </div>
      </div>
      <div className="admin-panel">
        {guardians.length ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Guardian</th>
                <th>Setup</th>
                <th>Identity</th>
                <th>Children</th>
                <th>Open invites</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {guardians.map((guardian) => (
                <tr key={guardian.id}>
                  <td className="admin-person">
                    <Link href={`/admin/users/${guardian.id}`}>{guardian.name}</Link>
                    <small>{guardian.email}</small>
                  </td>
                  <td>
                    <span className={guardian.setup === "Completed" ? "admin-lozenge admin-lozenge--success" : "admin-lozenge admin-lozenge--warning"}>
                      {guardian.setup}
                    </span>
                  </td>
                  <td>
                    <span className={lozengeClass(null, guardian.identity === "Rejected" ? "DECLINED" : guardian.identity === "Accepted" ? "APPROVED" : null)}>
                      {guardian.identity}
                    </span>
                  </td>
                  <td>{guardian.children}</td>
                  <td>{guardian.openInvites}</td>
                  <td>{guardian.joined}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="admin-empty">No guardian accounts yet.</p>
        )}
      </div>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminUserActions } from "@/components/admin/AdminUserActions";
import { accountLozenge, lozengeClass } from "@/components/admin/admin-ui";
import { listAdminAudit } from "@/lib/admin-portal/audit";
import { getAdminUserRecord, listGuardianChoices } from "@/lib/admin-portal/record";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminUserPage({ params }: PageProps) {
  const { id } = await params;
  const [user, guardianChoices, audit] = await Promise.all([
    getAdminUserRecord(id),
    listGuardianChoices(),
    listAdminAudit({ targetUserId: id, take: 20 }),
  ]);

  if (!user) notFound();

  return (
    <>
      <p className="admin-kicker">
        <Link href="/admin/users">Directory</Link>
        {" / "}
        {user.accountType === "MINOR" ? "Minor" : user.accountType === "GUARDIAN" ? "Guardian" : "Adult"}
      </p>
      <div className="admin-issue">
        <div>
          <div className="admin-issue__title">
            <h1>{user.name}</h1>
            <span className={accountLozenge(user.accountType)}>{user.accountType}</span>
            <span className="admin-lozenge">{user.stepLabel}</span>
            {user.suspended ? <span className="admin-lozenge admin-lozenge--danger">Suspended</span> : null}
            {user.ageGate ? <span className="admin-lozenge admin-lozenge--warning">Age gate mismatch</span> : null}
          </div>
          <p className="admin-lead">
            {user.email}
            {user.handle ? ` · @${user.handle.replace(/^@/, "")}` : ""} · {user.ageZoneLabel}
            {user.signedInNow ? " · signed in now" : ""}
          </p>

          {user.suspended && user.suspendReason ? (
            <p className="admin-banner admin-banner--err">Suspended: {user.suspendReason}</p>
          ) : null}

          <section className="admin-section">
            <h2>Onboarding</h2>
            <ul className="admin-timeline">
              {user.timeline.map((event) => (
                <li key={`${event.at}-${event.label}`}>
                  <time>{event.at}</time>
                  <span>{event.label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="admin-section">
            <h2>Token health</h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Link</th>
                  <th>State</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {user.tokens.map((token) => (
                  <tr key={token.kind}>
                    <td>{token.kind}</td>
                    <td>
                      <span className={lozengeClass(null, token.state === "Expired" ? "EXPIRED" : token.state === "Valid" ? "PENDING" : token.state === "Used" ? "APPROVED" : null)}>
                        {token.state}
                      </span>
                    </td>
                    <td>{token.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="admin-meta">Raw tokens and approval links are not shown.</p>
          </section>

          <section className="admin-section">
            <h2>Approval history</h2>
            {user.requests.length ? (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Guardian email</th>
                    <th>Protection</th>
                    <th>Sent</th>
                    <th>Expires</th>
                    <th>Identity captured</th>
                  </tr>
                </thead>
                <tbody>
                  {user.requests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <span className={lozengeClass(null, request.status)}>{request.status}</span>
                      </td>
                      <td>{request.parentEmail}</td>
                      <td>{request.protectionLevel ?? "—"}</td>
                      <td>{request.sentAt}</td>
                      <td>{request.expiresAt}</td>
                      <td>
                        {request.idDocType ?? "Simulated, not captured"}
                        <small className="admin-meta">
                          Guardian {request.guardianCountry ?? "—"} {request.guardianRegion ?? ""} · child {request.childLocation} · lives with guardian {request.livesWithGuardian}
                        </small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="admin-meta">No guardian invites yet.</p>
            )}
            <p className="admin-meta">ID and selfie steps in the product are simulated.</p>
          </section>

          {user.accountType === "GUARDIAN" ? (
            <section className="admin-section">
              <h2>Requests to this guardian</h2>
              {user.guardianRequests.length ? (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Child</th>
                      <th>Status</th>
                      <th>Sent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.guardianRequests.map((request) => (
                      <tr key={request.id}>
                        <td>
                          <Link href={`/admin/users/${request.childId}`}>{request.childName}</Link>
                        </td>
                        <td>
                          <span className={lozengeClass(null, request.status)}>{request.status}</span>
                        </td>
                        <td>{request.sentAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="admin-meta">No approval requests are addressed to this email.</p>
              )}
              <p className="admin-meta">
                Identity review: {user.identityStatus ?? "Not reviewed"}. Completed setup is what lets a guardian skip ID and selfie.
              </p>
            </section>
          ) : null}

          <section className="admin-section">
            <h2>Family</h2>
            <p>
              Guardians:{" "}
              {user.guardians.length
                ? user.guardians.map((guardian) => (
                    <Link key={guardian.id} href={`/admin/users/${guardian.id}`}>
                      {guardian.name}{" "}
                    </Link>
                  ))
                : "none"}
            </p>
            <p>
              Children:{" "}
              {user.children.length
                ? user.children.map((child) => (
                    <Link key={child.id} href={`/admin/users/${child.id}`}>
                      {child.name}{" "}
                    </Link>
                  ))
                : "none"}
            </p>
            <p className="admin-meta">
              Joined {user.createdAt}. Email {user.emailVerifiedAt ? `verified ${user.emailVerifiedAt}` : "not verified"}.{" "}
              {user.postCount} feed {user.postCount === 1 ? "post" : "posts"} stay in the feed if this account is deleted.
              {user.countryLabel ? ` Location ${user.region ? `${user.region}, ` : ""}${user.countryLabel}.` : ""}
            </p>
          </section>

          <section className="admin-section">
            <h2>Recent audit</h2>
            {audit.length ? (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Action</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</td>
                      <td>{entry.action}</td>
                      <td>{entry.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="admin-meta">No operator actions yet.</p>
            )}
          </section>
        </div>

        <AdminUserActions
          key={`${user.email}-${user.onboardingStep ?? ""}-${user.suspended}-${user.dateOfBirth}-${user.guardians.map((item) => item.id).join(",")}`}
          user={{
            id: user.id,
            email: user.email,
            accountType: user.accountType,
            emailVerified: user.emailVerified,
            hasPassword: user.hasPassword,
            onboardingStep: user.onboardingStep,
            guardianEmail: user.guardianEmail,
            firstName: user.firstName,
            lastName: user.lastName,
            dateOfBirth: user.dateOfBirth,
            country: user.country,
            region: user.region,
            ageGate: user.ageGate,
            suspended: user.suspended,
            guardians: user.guardians,
            postCount: user.postCount,
            childrenCount: user.children.length,
          }}
          guardianChoices={guardianChoices}
        />
      </div>
    </>
  );
}

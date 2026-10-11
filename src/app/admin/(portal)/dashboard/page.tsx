import Link from "next/link";
import type { ReactNode } from "react";
import { accountLozenge, lozengeClass } from "@/components/admin/admin-ui";
import { getAdminDashboard } from "@/lib/admin-portal/dashboard";
import { STUCK_LABELS } from "@/lib/admin-portal/stuck";

export const dynamic = "force-dynamic";

function Gadget({
  title,
  action,
  children,
  wide,
}: {
  title: string;
  action?: { href: string; label: string };
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={`admin-gadget${wide ? " admin-gadget--wide" : ""}`}>
      <header className="admin-gadget__head">
        <h2>{title}</h2>
        {action ? <Link href={action.href}>{action.label}</Link> : null}
      </header>
      <div className="admin-gadget__body">{children}</div>
    </section>
  );
}

function Tile({
  label,
  value,
  detail,
  href,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  href: string;
  tone?: "danger" | "warning" | "info";
}) {
  return (
    <Link className={`admin-tile${tone ? ` admin-tile--${tone}` : ""}`} href={href}>
      <span className="admin-tile__label">{label}</span>
      <strong className="admin-tile__value">{value}</strong>
      <span className="admin-tile__detail">{detail}</span>
    </Link>
  );
}

function BarList({ rows }: { rows: Array<{ key: string; label: string; count: number; href: string }> }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <ul className="admin-barlist">
      {rows.map((row) => (
        <li key={row.key}>
          <Link href={row.href}>
            <span className="admin-barlist__label">{row.label}</span>
            <span className="admin-barlist__track" aria-hidden="true">
              <span className="admin-barlist__fill" style={{ width: `${(row.count / max) * 100}%` }} />
            </span>
            <span className="admin-barlist__count">{row.count}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function AdminDashboardPage() {
  const data = await getAdminDashboard();
  const trendMax = Math.max(1, ...data.trend.map((day) => day.count));
  const trendTotal = data.trend.reduce((sum, day) => sum + day.count, 0);

  return (
    <>
      <div className="admin-pagehead">
        <div>
          <p className="admin-kicker">Users</p>
          <h1>Dashboard</h1>
          <p>Onboarding, guardian approval, and account administration at a glance.</p>
        </div>
        <Link className="admin-btn admin-btn--subtle" href="/admin/queue">
          Open queue
        </Link>
      </div>

      <div className="admin-tiles">
        <Tile
          label="Total users"
          value={data.totals.all}
          detail={`${data.totals.ADULT} adult · ${data.totals.MINOR} minor · ${data.totals.GUARDIAN} guardian`}
          href="/admin/users"
        />
        <Tile label="New in last 7 days" value={data.newLast7Days} detail="Accounts created" href="/admin/users" />
        <Tile
          label="Onboarding in progress"
          value={data.inProgress}
          detail="Not on the complete step"
          href="/admin/queue"
          tone="info"
        />
        <Tile
          label="Minors needing help"
          value={data.minorsNeedingHelp}
          detail="Expired invite, declined, or expired continue link"
          href="/admin/queue?accountType=MINOR"
          tone={data.minorsNeedingHelp ? "danger" : undefined}
        />
        <Tile
          label="Open guardian invites"
          value={data.openInvites}
          detail="Pending and not yet expired"
          href="/admin/queue?stuck=invite_open"
          tone="info"
        />
        <Tile
          label="Suspended"
          value={data.suspended}
          detail="Sign-in blocked"
          href="/admin/queue?stuck=suspended"
          tone={data.suspended ? "warning" : undefined}
        />
      </div>

      <div className="admin-gadgets">
        <Gadget title={`Signups, last ${data.trend.length} days`} action={{ href: "/admin/users", label: "Directory" }} wide>
          <div className="admin-trend" role="img" aria-label={`${trendTotal} accounts created in the last ${data.trend.length} days`}>
            {data.trend.map((day) => (
              <div className="admin-trend__col" key={day.day} title={`${day.day}: ${day.count}`}>
                <span className="admin-trend__count">{day.count || ""}</span>
                <span className="admin-trend__bar" style={{ height: `${(day.count / trendMax) * 100}%` }} />
                <span className="admin-trend__day">{day.day.slice(8)}</span>
              </div>
            ))}
          </div>
          <p className="admin-meta">
            {trendTotal} {trendTotal === 1 ? "account" : "accounts"} created. Days are UTC.
          </p>
        </Gadget>

        <Gadget title="Minor onboarding funnel" action={{ href: "/admin/users?accountType=MINOR", label: "All minors" }}>
          <BarList rows={data.funnel} />
        </Gadget>

        <Gadget title="Guardians" action={{ href: "/admin/guardians", label: "All guardians" }}>
          <dl className="admin-kv">
            <div>
              <dt>Identity accepted</dt>
              <dd>
                <span className="admin-lozenge admin-lozenge--success">{data.identity.accepted}</span>
              </dd>
            </div>
            <div>
              <dt>Identity rejected</dt>
              <dd>
                <span className={`admin-lozenge${data.identity.rejected ? " admin-lozenge--danger" : ""}`}>{data.identity.rejected}</span>
              </dd>
            </div>
            <div>
              <dt>Not reviewed</dt>
              <dd>
                <span className="admin-lozenge">{data.identity.notReviewed}</span>
              </dd>
            </div>
            <div>
              <dt>Setup unfinished</dt>
              <dd>
                <Link href="/admin/users?accountType=GUARDIAN&step=guardian-setup">
                  <span className={`admin-lozenge${data.identity.unfinished ? " admin-lozenge--warning" : ""}`}>{data.identity.unfinished}</span>
                </Link>
              </dd>
            </div>
          </dl>
          <p className="admin-meta">
            {data.identity.total} guardian {data.identity.total === 1 ? "account" : "accounts"}. ID and selfie capture is simulated.
          </p>
        </Gadget>

        <Gadget
          title="Needs attention"
          action={{ href: "/admin/queue", label: `View all ${data.attentionTotal}` }}
          wide
        >
          {data.attention.length ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Type</th>
                  <th>Blocker</th>
                </tr>
              </thead>
              <tbody>
                {data.attention.map((row) => (
                  <tr key={row.id}>
                    <td className="admin-person">
                      <Link href={`/admin/users/${row.id}`}>{row.name}</Link>
                      <small>{row.email}</small>
                    </td>
                    <td>
                      <span className={accountLozenge(row.accountType)}>{row.accountType}</span>
                    </td>
                    <td>
                      {row.stuck ? (
                        <Link href={`/admin/queue?stuck=${row.stuck}`}>
                          <span className={lozengeClass(row.stuck)}>{STUCK_LABELS[row.stuck]}</span>
                        </Link>
                      ) : null}
                      <small className="admin-meta">{row.detail}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="admin-empty">Nobody is blocked right now.</p>
          )}
        </Gadget>

        <Gadget title="Parent approval requests" action={{ href: "/admin/consent", label: "Consent register" }}>
          <BarList rows={data.approvals} />
          <p className="admin-meta">Counts every request, including ones replaced by a newer invite.</p>
        </Gadget>

        <Gadget title="Recent operator activity" action={{ href: "/admin/audit", label: "Audit log" }} wide>
          {data.audit.length ? (
            <ul className="admin-activity">
              {data.audit.map((entry) => (
                <li key={entry.id}>
                  <time>{entry.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</time>
                  <span>
                    <strong>{entry.action}</strong>
                    {" · "}
                    {entry.userId ? <Link href={`/admin/users/${entry.userId}`}>{entry.userLabel}</Link> : entry.userLabel}
                    <small className="admin-meta">{entry.reason}</small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-empty">No operator actions yet.</p>
          )}
        </Gadget>
      </div>
    </>
  );
}

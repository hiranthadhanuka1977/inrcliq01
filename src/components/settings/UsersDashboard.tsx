import Link from "next/link";
import { AgeZoneBadgeIcon } from "@/components/guardian/family-center/AgeZoneBadge";
import {
  BreakdownList,
  DailyTrend,
  DashboardAvatar,
  DashboardCard,
  StatCard,
  formatCount,
  formatShortDate,
} from "@/components/settings/DashboardParts";
import type { SettingsUserSummary } from "@/lib/settings/dashboard";
import type { AgeZoneCode } from "@/lib/utils/age-zone";

export function UsersDashboard({ summary }: { summary: SettingsUserSummary }) {
  const inProgress = summary.total - summary.onboardingComplete;
  const approvalsTotal = summary.parentApprovals.reduce((sum, row) => sum + row.count, 0);

  if (summary.total === 0) {
    return <p className="settings-empty">No users registered yet.</p>;
  }

  return (
    <div className="settings-dashboard">
      <div className="settings-stats">
        <StatCard
          label="Total users"
          value={summary.total}
          detail={`${formatCount(summary.realSignups)} signed up · ${formatCount(summary.demoAccounts)} demo accounts`}
          icon="users"
          tone="blue"
          meter={{ value: summary.realSignups, total: summary.total, label: "real signups" }}
        />
        <StatCard
          label="New this week"
          value={summary.newLast7Days}
          detail={`${formatCount(summary.newLast30Days)} in the last 30 days`}
          icon="userPlus"
          tone="green"
          trend={summary.dailySignups.slice(-7)}
        />
        <StatCard
          label="Signed in now"
          value={summary.signedInNow}
          detail="Accounts with an active session"
          icon="activity"
          tone="teal"
          live
        />
        <StatCard
          label="Email verified"
          value={summary.emailVerified}
          detail={`${formatCount(summary.total - summary.emailVerified)} not verified yet`}
          icon="mail"
          tone="violet"
          meter={{ value: summary.emailVerified, total: summary.total, label: "of all accounts" }}
        />
        <StatCard
          label="Onboarding complete"
          value={summary.onboardingComplete}
          detail={`${formatCount(inProgress)} still in progress`}
          icon="checkCircle"
          tone="amber"
          meter={{ value: summary.onboardingComplete, total: summary.total, label: "finished setup" }}
        />
      </div>

      <DashboardCard title={`New accounts, last ${summary.dailySignups.length} days`} icon="chart">
        <p className="settings-card__hint">Accounts created per day (UTC). Hover a bar for the exact count.</p>
        <DailyTrend days={summary.dailySignups} noun={["account", "accounts"]} />
      </DashboardCard>

      <div className="settings-dashboard__grid">
        <DashboardCard title="Account types" icon="users">
          <BreakdownList segments={summary.accountTypes} total={summary.total} />
        </DashboardCard>

        <DashboardCard title="Age zones" icon="shield">
          <BreakdownList
            segments={summary.ageZones}
            total={summary.total}
            renderIcon={(segment) => (
              <AgeZoneBadgeIcon
                iconBadgeKey={null}
                zone={segment.key as AgeZoneCode}
                className="settings-breakdown__icon"
              />
            )}
          />
          <p className="settings-card__hint">Accounts without a date of birth count as Kids if under 18, otherwise Adult.</p>
        </DashboardCard>

        <DashboardCard title="Onboarding in progress" icon="clock">
          {summary.onboardingSteps.length === 0 ? (
            <p className="settings-card__hint">Every account has finished onboarding.</p>
          ) : (
            <BreakdownList segments={summary.onboardingSteps} total={inProgress} />
          )}
        </DashboardCard>

        <DashboardCard title="Parent approvals" icon="family">
          {approvalsTotal === 0 ? (
            <p className="settings-card__hint">No parent approval requests yet.</p>
          ) : (
            <BreakdownList segments={summary.parentApprovals} total={approvalsTotal} />
          )}
          <p className="settings-card__hint">
            {formatCount(summary.guardianChildLinks)} parent–child{" "}
            {summary.guardianChildLinks === 1 ? "link" : "links"} in Family Circle.
          </p>
        </DashboardCard>

        <DashboardCard title="Signup method" icon="login">
          <BreakdownList segments={summary.signupMethods} total={summary.total} />
        </DashboardCard>
      </div>

      <DashboardCard
        title="Latest accounts"
        icon="userPlus"
        action={
          <Link href="/settings/users" className="settings-dash-card__action">
            View all users
          </Link>
        }
      >
        <RecentUsersTable users={summary.recentUsers} />
      </DashboardCard>
    </div>
  );
}

function RecentUsersTable({ users }: { users: SettingsUserSummary["recentUsers"] }) {
  return (
    <div className="settings-table-wrap">
      <table className="settings-table settings-table--dash">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">Type</th>
            <th scope="col">Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const name = user.name !== "—" ? user.name : "Unnamed user";
            return (
              <tr key={user.id}>
                <td>
                  <span className="settings-person">
                    <DashboardAvatar name={user.name !== "—" ? user.name : user.email.split("@")[0]} />
                    <Link href={`/settings/users/${user.id}`}>{name}</Link>
                  </span>
                </td>
                <td className="settings-table__muted">{user.email}</td>
                <td>
                  <span className="settings-tag settings-tag--flush">{user.typeLabel}</span>
                </td>
                <td className="settings-table__nowrap settings-table__muted">{formatShortDate(user.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

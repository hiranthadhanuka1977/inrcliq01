import Link from "next/link";
import { AgeZoneBadgeIcon } from "@/components/guardian/family-center/AgeZoneBadge";
import {
  BreakdownList,
  DailyTrend,
  DashboardCard,
  StatCard,
  formatCount,
  formatShortDate,
  percent,
} from "@/components/settings/DashboardParts";
import type { SettingsUserSummary } from "@/lib/settings/dashboard";
import type { AgeZoneCode } from "@/lib/utils/age-zone";

export function UsersDashboard({ summary }: { summary: SettingsUserSummary }) {
  const inProgress = summary.total - summary.onboardingComplete;
  const approvalsTotal = summary.parentApprovals.reduce((sum, row) => sum + row.count, 0);
  const trendTotal = summary.dailySignups.reduce((sum, day) => sum + day.count, 0);

  if (summary.total === 0) {
    return <p className="settings-empty">No users registered yet.</p>;
  }

  return (
    <div className="settings-dashboard">
      <div className="settings-stats">
        <StatCard
          label="Total users"
          value={summary.total}
          detail={`${formatCount(summary.realSignups)} signed up · ${formatCount(summary.seededCreators)} seeded creators`}
        />
        <StatCard
          label="New this week"
          value={summary.newLast7Days}
          detail={`${formatCount(summary.newLast30Days)} in the last 30 days`}
        />
        <StatCard label="Signed in now" value={summary.signedInNow} detail="Accounts with an active session" />
        <StatCard
          label="Email verified"
          value={summary.emailVerified}
          detail={`${percent(summary.emailVerified, summary.total)}% of all accounts`}
        />
        <StatCard
          label="Onboarding complete"
          value={summary.onboardingComplete}
          detail={`${formatCount(inProgress)} still in progress`}
        />
      </div>

      <DashboardCard title={`New accounts, last ${summary.dailySignups.length} days`} wide>
        <p className="settings-card__hint">{formatCount(trendTotal)} accounts created in this period (UTC days).</p>
        <DailyTrend days={summary.dailySignups} noun={["account", "accounts"]} />
      </DashboardCard>

      <div className="settings-dashboard__grid">
        <DashboardCard title="Account types">
          <BreakdownList segments={summary.accountTypes} total={summary.total} />
        </DashboardCard>

        <DashboardCard title="Age zones">
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

        <DashboardCard title="Onboarding in progress">
          {summary.onboardingSteps.length === 0 ? (
            <p className="settings-card__hint">Every account has finished onboarding.</p>
          ) : (
            <BreakdownList segments={summary.onboardingSteps} total={inProgress} />
          )}
        </DashboardCard>

        <DashboardCard title="Parent approvals">
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

        <DashboardCard title="Signup method">
          <BreakdownList segments={summary.signupMethods} total={summary.total} />
        </DashboardCard>
      </div>

      <DashboardCard title="Latest accounts" wide>
        <RecentUsersTable users={summary.recentUsers} />
        <p className="settings-card__footer">
          <Link href="/settings/users">View all users</Link>
        </p>
      </DashboardCard>
    </div>
  );
}

function RecentUsersTable({ users }: { users: SettingsUserSummary["recentUsers"] }) {
  return (
    <div className="settings-table-wrap">
      <table className="settings-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">Type</th>
            <th scope="col">Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.typeLabel}</td>
              <td>{formatShortDate(user.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

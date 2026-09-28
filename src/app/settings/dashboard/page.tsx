import { DashboardPills, parseDashboardTab } from "@/components/settings/DashboardPills";
import { FeedDashboard } from "@/components/settings/FeedDashboard";
import { UsersDashboard } from "@/components/settings/UsersDashboard";
import { getSettingsUserSummary } from "@/lib/settings/dashboard";
import { getSettingsFeedSummary } from "@/lib/settings/feed-dashboard";

export const dynamic = "force-dynamic";

const SUBTITLES = {
  users: "A summary of accounts registered on the platform.",
  feed: "A summary of posts on the home feed and profiles.",
} as const;

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function SettingsDashboardPage({ searchParams }: PageProps) {
  const tab = parseDashboardTab((await searchParams).tab);

  const content =
    tab === "feed" ? (
      <FeedDashboard summary={await getSettingsFeedSummary()} />
    ) : (
      <UsersDashboard summary={await getSettingsUserSummary()} />
    );

  return (
    <div className="settings-panel">
      <div className="settings-panel__head">
        <h1 className="settings-panel__title">Dashboard</h1>
        <p className="settings-panel__subtitle">{SUBTITLES[tab]}</p>
      </div>
      <DashboardPills active={tab} />
      {content}
    </div>
  );
}

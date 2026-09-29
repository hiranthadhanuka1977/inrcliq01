import { FeedDashboard } from "@/components/settings/FeedDashboard";
import { SettingsPills } from "@/components/settings/SettingsPills";
import { UsersDashboard } from "@/components/settings/UsersDashboard";
import { getSettingsUserSummary } from "@/lib/settings/dashboard";
import { getSettingsFeedSummary } from "@/lib/settings/feed-dashboard";

export const dynamic = "force-dynamic";

const PILLS = [
  { id: "users", label: "Users", href: "/settings/dashboard" },
  { id: "feed", label: "Feed", href: "/settings/dashboard?tab=feed" },
];

const SUBTITLES = {
  users: "A summary of accounts registered on the platform.",
  feed: "A summary of posts on the home feed and profiles.",
} as const;

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function SettingsDashboardPage({ searchParams }: PageProps) {
  const tab = (await searchParams).tab === "feed" ? "feed" : "users";

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
      <SettingsPills pills={PILLS} active={tab} label="Dashboard views" />
      {content}
    </div>
  );
}

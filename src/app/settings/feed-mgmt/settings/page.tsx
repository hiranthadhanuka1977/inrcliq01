import { FeedSeedSettings } from "@/components/settings/FeedSeedSettings";
import { getDemoUsersStatus } from "@/lib/settings/demo-users";
import { getFeedSeedStatus } from "@/lib/settings/feed-seed";

export const dynamic = "force-dynamic";

export default async function SettingsFeedMgmtSettingsPage() {
  const [status, demoUsers] = await Promise.all([getFeedSeedStatus(), getDemoUsersStatus()]);
  return <FeedSeedSettings initialStatus={status} initialDemoUsers={demoUsers} />;
}

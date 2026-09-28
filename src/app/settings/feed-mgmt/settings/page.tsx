import { FeedSeedSettings } from "@/components/settings/FeedSeedSettings";
import { getFeedSeedStatus } from "@/lib/settings/feed-seed";

export const dynamic = "force-dynamic";

export default async function SettingsFeedMgmtSettingsPage() {
  return <FeedSeedSettings initialStatus={await getFeedSeedStatus()} />;
}

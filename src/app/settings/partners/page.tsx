import { PartnersSettings } from "@/components/settings/PartnersSettings";
import { listSettingsPartners } from "@/lib/settings/partners";

export const dynamic = "force-dynamic";

export default async function SettingsPartnersPage() {
  return <PartnersSettings partners={await listSettingsPartners()} />;
}

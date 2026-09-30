import { PartnerApiGuide } from "@/components/settings/PartnerApiGuide";
import { getAppUrl } from "@/lib/api-helpers";

export default function SettingsPartnersGuidePage() {
  return <PartnerApiGuide appUrl={getAppUrl()} />;
}

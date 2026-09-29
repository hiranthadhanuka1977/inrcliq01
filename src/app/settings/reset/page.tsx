import { redirect } from "next/navigation";
import { ResetPanel } from "@/components/settings/ResetPanel";
import { SETTINGS_RESET_ENABLED } from "@/lib/settings/access";

export default function SettingsResetPage() {
  if (!SETTINGS_RESET_ENABLED) {
    redirect("/settings/dashboard");
  }

  return <ResetPanel />;
}

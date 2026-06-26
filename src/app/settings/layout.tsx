import { SettingsHeader } from "@/components/settings/SettingsHeader";
import { SettingsNav } from "@/components/settings/SettingsNav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SettingsHeader />
      <div className="settings-shell">
        <SettingsNav />
        <div className="settings-content">{children}</div>
      </div>
    </>
  );
}
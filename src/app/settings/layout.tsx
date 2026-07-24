"use client";

import { usePathname } from "next/navigation";
import { SettingsHeader } from "@/components/settings/SettingsHeader";
import { SettingsNav } from "@/components/settings/SettingsNav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/settings/unlock") {
    return children;
  }

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

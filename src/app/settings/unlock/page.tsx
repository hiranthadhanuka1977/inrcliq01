import { Suspense } from "react";
import { SettingsUnlockForm } from "@/components/settings/SettingsUnlockForm";

export default function SettingsUnlockPage() {
  return (
    <Suspense fallback={null}>
      <SettingsUnlockForm />
    </Suspense>
  );
}

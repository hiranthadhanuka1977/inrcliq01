import type { FamilyCenterData } from "@/lib/guardian/family-center";
import { staticDashboardExtras } from "@/lib/guardian/family-center-static";
import {
  countUnresolvedSafetyAlerts,
  listSafetyAlertCardsForGuardian,
} from "@/lib/guardian/safety-alerts";

/** Dashboard extras with live Safety Alerts for the signed-in guardian. */
export async function getFamilyCenterDashboardExtras(data: FamilyCenterData) {
  const [alerts, unresolvedAlerts] = await Promise.all([
    listSafetyAlertCardsForGuardian(data.guardian.id),
    countUnresolvedSafetyAlerts(data.guardian.id),
  ]);
  return {
    ...staticDashboardExtras(data.children, { alerts }),
    unresolvedAlerts,
  };
}

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isLiveBackend } from "@/lib/backend/config";
import { liveProtectionTiers } from "@/lib/backend/routes";
import { PROTECTION_TIER_LABELS, getProtectionChecklistItems } from "@/lib/guardian/constants";
import type { ProtectionTier } from "@/lib/guardian/constants";

/**
 * The protection tiers the guardian's last step offers.
 *
 * Live mode reads them from the API, where they are reference data product can
 * edit. Mock mode answers from the prototype's own constants, in the same shape,
 * so the step renders identically either way.
 */
export async function GET(request: Request) {
  if (isLiveBackend()) return liveProtectionTiers(request as NextRequest);

  const childFirstName = new URL(request.url).searchParams.get("childFirstName") ?? "Your child";
  const descriptions: Record<ProtectionTier, string> = {
    strict: "Tightest limits. Best for younger children or a first account.",
    standard: "Balanced protection. Recommended for most families.",
    relaxed: "Lightest limits. Best for older teens you already trust online.",
  };

  const tiers = (Object.keys(PROTECTION_TIER_LABELS) as ProtectionTier[]).map((code) => ({
    code,
    label: PROTECTION_TIER_LABELS[code],
    description: descriptions[code],
    checklistItems: getProtectionChecklistItems(code, childFirstName),
    isDefault: code === "standard",
  }));

  return NextResponse.json({ tiers });
}

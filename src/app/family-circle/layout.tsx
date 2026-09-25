import type { Metadata } from "next";
import { FamilyCenterHeader } from "@/components/guardian/family-center/FamilyCenterHeader";
import { FamilyCenterNav } from "@/components/guardian/family-center/FamilyCenterNav";
import { FeedSessionProvider } from "@/context/feed/FeedSessionContext";
import { getFamilyCenterDashboardExtras } from "@/lib/guardian/family-center-dashboard";
import { hasUnreadFamilyActivity } from "@/lib/guardian/family-center-static";
import { requireFamilyCenterSession } from "@/lib/guardian/require-family-center";
import { getSessionNavProfile } from "@/lib/feed/session-nav-profile";
import "@/styles/feed/account-profile.css";
import "@/styles/feed/family-center.css";
import "@/styles/family-center-portal.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "INRCLIQ · Family Circle",
  description: "Manage linked minor accounts, safety controls, and guardian alerts",
};

export default async function FamilyCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [navProfile, { data }] = await Promise.all([
    getSessionNavProfile(),
    requireFamilyCenterSession(),
  ]);
  const extras = await getFamilyCenterDashboardExtras(data);
  const firstName =
    navProfile.firstName || data.guardianName?.split(/\s+/)[0] || null;

  return (
    <FeedSessionProvider
      firstName={firstName}
      avatarUrl={navProfile.avatarUrl}
      avatarColor={navProfile.avatarColor}
      verified={navProfile.verified}
      isGuardian={navProfile.isGuardian}
      profileHref={navProfile.profileHref}
    >
      <div className="family-portal-path-shell feed-path-shell">
        <FamilyCenterHeader showActivityDot={hasUnreadFamilyActivity(data.children)} />
        <div className="family-portal-shell">
          <FamilyCenterNav
            alertCount={extras.unresolvedAlerts}
            requestCount={extras.pendingRequests}
            accountCount={data.children.length}
            linkedChildren={data.children}
          />
          <div className="family-portal-content">{children}</div>
        </div>
      </div>
    </FeedSessionProvider>
  );
}

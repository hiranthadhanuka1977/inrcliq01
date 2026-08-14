import { SellerDashboard } from "@/components/seller/SellerDashboard";
import { SellerVerifyMarketingView } from "@/components/seller/SellerVerifyMarketingView";
import { getCreatorCollectionRaw } from "@/lib/feed/collection";
import { getSessionUser } from "@/lib/session";
import { listSellerBookings } from "@/lib/seller/bookings";
import {
  getCollectionSummaryStats,
  getServiceRequestsSummaryStats,
} from "@/lib/seller/dashboard-stats";
import { countInboundFollowersForUser } from "@/lib/seller/follower-count";
import { getSellerIdentity } from "@/lib/seller/identity";
import { getSellerServiceRequestsConfigForUser } from "@/lib/seller/service-requests-store";

export const dynamic = "force-dynamic";

export default async function SellerDashboardPage() {
  const [user, identity] = await Promise.all([getSessionUser(), getSellerIdentity()]);
  const firstName = user?.firstName ?? identity?.displayName?.split(" ")[0] ?? null;

  if (!identity?.verified) {
    const followerCount = user?.id ? await countInboundFollowersForUser(user.id) : 0;
    return <SellerVerifyMarketingView firstName={firstName} followerCount={followerCount} />;
  }

  const slug = identity.slug;

  const [collection, serviceRequestsConfig, bookings] = await Promise.all([
    getCreatorCollectionRaw(slug),
    identity.hasSpecialRequests && identity.userId
      ? getSellerServiceRequestsConfigForUser(identity.userId)
      : Promise.resolve(null),
    identity.hasSpecialRequests ? listSellerBookings(slug) : Promise.resolve([]),
  ]);

  const collectionStats = getCollectionSummaryStats(collection);
  const serviceRequestsStats =
    serviceRequestsConfig != null
      ? getServiceRequestsSummaryStats(serviceRequestsConfig.content, bookings, slug)
      : null;

  return (
    <SellerDashboard
      firstName={firstName}
      hasSpecialRequests={Boolean(identity.hasSpecialRequests)}
      collectionStats={collectionStats}
      serviceRequestsStats={serviceRequestsStats}
    />
  );
}

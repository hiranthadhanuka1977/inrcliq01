import { SellerDashboard } from "@/components/seller/SellerDashboard";
import { getCreatorCollectionRaw } from "@/lib/feed/collection";
import { getSessionUser } from "@/lib/session";
import { listSellerBookings } from "@/lib/seller/bookings";
import {
  getCollectionSummaryStats,
  getServiceRequestsSummaryStats,
} from "@/lib/seller/dashboard-stats";
import { getSellerIdentity } from "@/lib/seller/identity";
import { getSellerServiceRequestsConfigForUser } from "@/lib/seller/service-requests-store";

export const dynamic = "force-dynamic";

export default async function SellerDashboardPage() {
  const [user, identity] = await Promise.all([getSessionUser(), getSellerIdentity()]);
  const slug = identity?.slug ?? null;

  const [collection, serviceRequestsConfig, bookings] = await Promise.all([
    slug ? getCreatorCollectionRaw(slug) : Promise.resolve(null),
    identity?.hasSpecialRequests && identity.userId
      ? getSellerServiceRequestsConfigForUser(identity.userId)
      : Promise.resolve(null),
    identity?.hasSpecialRequests && slug
      ? listSellerBookings(slug)
      : Promise.resolve([]),
  ]);

  const collectionStats = getCollectionSummaryStats(collection);
  const serviceRequestsStats =
    serviceRequestsConfig != null && slug
      ? getServiceRequestsSummaryStats(serviceRequestsConfig.content, bookings, slug)
      : serviceRequestsConfig != null
        ? getServiceRequestsSummaryStats(serviceRequestsConfig.content, bookings)
        : null;

  return (
    <SellerDashboard
      firstName={user?.firstName ?? identity?.displayName?.split(" ")[0] ?? null}
      hasSpecialRequests={Boolean(identity?.hasSpecialRequests)}
      collectionStats={collectionStats}
      serviceRequestsStats={serviceRequestsStats}
    />
  );
}

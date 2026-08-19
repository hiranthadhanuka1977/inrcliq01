import { SellerServiceRequestsView } from "@/components/seller/SellerServiceRequestsView";
import { listSellerBookings } from "@/lib/seller/bookings";
import { requireSellerSpecialRequestsIdentity } from "@/lib/seller/identity";
import { getSellerServiceRequestsConfigForUser } from "@/lib/seller/service-requests-store";
import { findCreatorIdForSeller, listUnavailableDateKeys } from "@/lib/seller/unavailable-dates";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

function parseTab(
  value: string | undefined,
): "calendar" | "offerings" | "inbox" | "setup" | undefined {
  if (
    value === "calendar" ||
    value === "offerings" ||
    value === "inbox" ||
    value === "setup"
  ) {
    return value;
  }
  return undefined;
}

export default async function SellerServiceRequestsPage({ searchParams }: PageProps) {
  const identity = await requireSellerSpecialRequestsIdentity();
  if (!identity) {
    redirect("/seller");
  }

  const config = await getSellerServiceRequestsConfigForUser(identity.userId);
  if (!config) notFound();

  const bookings = await listSellerBookings(identity.slug);
  const creatorId = await findCreatorIdForSeller(identity.userId, identity.slug);
  const unavailableDates = creatorId ? await listUnavailableDateKeys(creatorId) : [];
  const { tab } = await searchParams;

  return (
    <SellerServiceRequestsView
      slug={identity.slug}
      previewHref={`/feed/profile/${identity.slug}/requests`}
      initialConfig={config}
      initialBookings={bookings}
      initialUnavailableDates={unavailableDates}
      initialTab={parseTab(tab)}
    />
  );
}

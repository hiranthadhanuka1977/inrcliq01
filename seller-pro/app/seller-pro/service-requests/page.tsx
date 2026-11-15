import { ServiceBoard, type ServiceSection } from "../../../components/manage/ServiceBoard";
import type { InboxBooking } from "../../../components/manage/RequestInbox";
import { loadFailure } from "../../../components/load-failure";
import { mainJson, onMain } from "../../../lib/main";
import { getSellerProSession } from "../../../lib/session";
import type { AvailabilityPayload, BookingsPayload, ServiceRequestsPayload } from "../../../lib/types";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ section?: string }>;
};

function parseSection(value: string | undefined): ServiceSection {
  if (value === "requests" || value === "calendar" || value === "page") return value;
  return "offerings";
}

export default async function ServiceRequestsPage({ searchParams }: PageProps) {
  if (!(await getSellerProSession())) return null;

  try {
    const [config, bookingsPayload, availabilityPayload] = await Promise.all([
      mainJson<ServiceRequestsPayload>("/api/seller/service-requests"),
      mainJson<BookingsPayload>("/api/seller/bookings"),
      mainJson<AvailabilityPayload>("/api/seller/availability"),
    ]);
    const { section } = await searchParams;
    const bookings: InboxBooking[] = bookingsPayload.bookings.map((booking) => ({
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
      statusLabel: booking.statusLabel,
      requestLabel: booking.requestLabel,
      requesterName: booking.requesterName,
      totalLabel: booking.totalLabel,
      deliverBy: booking.deliverBy,
      requestedForAt: booking.requestedForAt,
    }));
    return (
      <ServiceBoard
        config={config}
        previewHref={onMain(config.previewHref)}
        section={parseSection(section)}
        bookings={bookings}
        unavailableDates={availabilityPayload.dates ?? []}
        detailsBase={onMain("/feed/bookings?tab=inbound&booking=")}
      />
    );
  } catch (error) {
    return loadFailure(error, "Service requests");
  }
}

import { notFound, redirect } from "next/navigation";
import BookingDeliverView from "@/components/feed/bookings/BookingDeliverView";
import { getInboundBookingForDelivery } from "@/lib/feed/user-bookings";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const booking = await getInboundBookingForDelivery(id);
  const action = booking?.instantBooking ? "Deliver" : "Mark as completed";
  return {
    title: booking
      ? `${action} ${booking.reference} · Calendar · INRCLIQ`
      : `${action} · Calendar · INRCLIQ`,
  };
}

export default async function BookingDeliverPage({ params }: PageProps) {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const { id } = await params;
  const booking = await getInboundBookingForDelivery(id);
  if (!booking) notFound();

  return <BookingDeliverView booking={booking} />;
}

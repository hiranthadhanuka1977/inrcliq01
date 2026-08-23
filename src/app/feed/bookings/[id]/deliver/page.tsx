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
  return {
    title: booking
      ? `Deliver ${booking.reference} · Calendar · INRCLIQ`
      : "Deliver · Calendar · INRCLIQ",
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

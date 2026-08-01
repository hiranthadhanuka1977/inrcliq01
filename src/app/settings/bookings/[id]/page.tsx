import { notFound } from "next/navigation";
import { BookingDetailPanel } from "@/components/settings/BookingDetailPanel";
import { getSettingsBookingById } from "@/lib/settings/bookings";

export const dynamic = "force-dynamic";

interface BookingDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: BookingDetailPageProps) {
  const { id } = await params;
  const booking = await getSettingsBookingById(id);
  if (!booking) return { title: "Booking · Settings · INRCLIQ" };
  return { title: `${booking.reference} · Bookings · Settings · INRCLIQ` };
}

export default async function SettingsBookingDetailPage({ params }: BookingDetailPageProps) {
  const { id } = await params;
  const booking = await getSettingsBookingById(id);
  if (!booking) notFound();

  return <BookingDetailPanel booking={booking} />;
}

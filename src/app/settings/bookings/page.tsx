import { BookingsPanel } from "@/components/settings/BookingsPanel";
import { listSettingsBookingsByCreator } from "@/lib/settings/bookings";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bookings · Settings · INRCLIQ",
};

export default async function SettingsBookingsPage() {
  const groups = await listSettingsBookingsByCreator();
  return <BookingsPanel groups={groups} />;
}

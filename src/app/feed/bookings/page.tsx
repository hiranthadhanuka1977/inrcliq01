import { Suspense } from "react";
import { redirect } from "next/navigation";
import MyBookingsView from "@/components/feed/bookings/MyBookingsView";
import { listMySpecialRequestBookings } from "@/lib/feed/user-bookings";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bookings · INRCLIQ",
};

export default async function FeedBookingsPage() {
  const bookings = await listMySpecialRequestBookings();
  if (!bookings) redirect("/");

  return (
    <Suspense fallback={<MyBookingsView bookings={bookings} />}>
      <MyBookingsView bookings={bookings} />
    </Suspense>
  );
}

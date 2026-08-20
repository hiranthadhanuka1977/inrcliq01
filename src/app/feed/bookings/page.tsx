import { Suspense } from "react";
import { redirect } from "next/navigation";
import MyBookingsView from "@/components/feed/bookings/MyBookingsView";
import { listMySpecialRequestBookings } from "@/lib/feed/user-bookings";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bookings · INRCLIQ",
};

async function currentUserIsVerified() {
  const user = await getSessionUser();
  if (!user) return false;

  const [profile, creator] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: { verified: true },
    }),
    prisma.creatorUser.findFirst({
      where: { userId: user.id },
      select: { verified: true },
    }),
  ]);

  return Boolean(profile?.verified) || Boolean(creator?.verified);
}

export default async function FeedBookingsPage() {
  const bookings = await listMySpecialRequestBookings();
  if (!bookings) redirect("/");

  const inboundEnabled = await currentUserIsVerified();

  return (
    <Suspense fallback={<MyBookingsView bookings={bookings} inboundEnabled={inboundEnabled} />}>
      <MyBookingsView bookings={bookings} inboundEnabled={inboundEnabled} />
    </Suspense>
  );
}

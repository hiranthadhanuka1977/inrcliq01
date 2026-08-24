import { prisma } from "@/lib/prisma";
import {
  acceptSettingsBooking,
  declineSettingsBooking,
  getSettingsBookingById,
  type SettingsBookingDetail,
  type SettingsBookingRow,
} from "@/lib/settings/bookings";
import { DEFAULT_SELLER_CREATOR_SLUG } from "@/lib/seller/constants";

function statusLabel(status: string) {
  switch (status) {
    case "RECEIVED":
      return "Received";
    case "NEW_OFFER":
      return "New offer";
    case "COUNTER_OFFER":
      return "Counter offer";
    case "OFFER_ACCEPTED":
      return "Awaiting acceptance";
    case "ACCEPTED":
      return "Accepted";
    case "IN_PROGRESS":
      return "In Progress";
    case "DELIVERED":
      return "Delivered";
    case "DECLINED":
      return "Declined";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function requesterName(user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
  handle: string | null;
}) {
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (user.handle?.trim()) return user.handle.trim();
  return user.email;
}

export async function listSellerBookings(
  slug: string = DEFAULT_SELLER_CREATOR_SLUG,
): Promise<SettingsBookingRow[]> {
  const requests = await prisma.specialRequest.findMany({
    where: { creator: { slug } },
    orderBy: [{ createdAt: "desc" }],
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          handle: true,
        },
      },
    },
  });

  return requests.map((request) => ({
    id: request.id,
    reference: request.reference,
    status: request.status,
    statusLabel: statusLabel(request.status),
    requestLabel: request.requestLabel,
    category: request.category,
    contentType: request.contentType,
    totalFee: request.totalFee,
    currency: request.currency,
    totalLabel: `${request.totalFee} ${request.currency}`,
    requesterName: requesterName(request.user),
    requesterEmail: request.user.email,
    createdAt: request.createdAt.toISOString(),
    createdLabel: formatDate(request.createdAt),
    deliverBy: request.deliverBy?.toISOString() ?? null,
    requestedForAt: request.requestedForAt?.toISOString() ?? null,
  }));
}

export async function getSellerBookingById(
  id: string,
  slug: string = DEFAULT_SELLER_CREATOR_SLUG,
): Promise<SettingsBookingDetail | null> {
  const booking = await getSettingsBookingById(id);
  if (!booking) return null;
  if (booking.creator.slug !== slug) return null;
  return booking;
}

export async function acceptSellerBooking(
  id: string,
  slug: string = DEFAULT_SELLER_CREATOR_SLUG,
) {
  const booking = await prisma.specialRequest.findFirst({
    where: { id, creator: { slug } },
    select: { id: true },
  });
  if (!booking) {
    return { ok: false as const, error: "Booking not found." };
  }
  return acceptSettingsBooking(id);
}

export async function declineSellerBooking(
  id: string,
  reason: string,
  slug: string = DEFAULT_SELLER_CREATOR_SLUG,
) {
  const booking = await prisma.specialRequest.findFirst({
    where: { id, creator: { slug } },
    select: { id: true },
  });
  if (!booking) {
    return { ok: false as const, error: "Booking not found." };
  }
  return declineSettingsBooking(id, reason);
}

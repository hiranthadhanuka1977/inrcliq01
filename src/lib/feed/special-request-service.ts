import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { BookingConfirmationPayload } from "@/lib/feed/booking-confirmation";

export type CreateSpecialRequestInput = {
  userId: string;
  creatorId: string;
  threadId?: string | null;
  reference: string;
  requestLabel: string;
  category?: string | null;
  occasion?: string | null;
  contentType?: string | null;
  duration?: string | null;
  publishingMethod?: string | null;
  recipientLabel?: string | null;
  recipientUsername?: string | null;
  shoutoutMessage?: string | null;
  specialInstructions?: string | null;
  isAppearance?: boolean;
  instantBooking?: boolean;
  appearanceLocation?: string | null;
  appearanceExpectation?: string | null;
  appearanceReference?: string | null;
  dayRate?: number;
  feedFee?: number;
  totalFee?: number;
  currency?: string;
  requestedForAt?: Date | null;
  deliverBy?: Date | null;
  detailsJson?: Prisma.InputJsonValue | null;
};

function asInt(value: number | undefined, fallback = 0) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.round(value as number));
}

export async function createSpecialRequest(input: CreateSpecialRequestInput) {
  return prisma.specialRequest.create({
    data: {
      reference: input.reference,
      status: "RECEIVED",
      userId: input.userId,
      creatorId: input.creatorId,
      threadId: input.threadId ?? null,
      requestLabel: input.requestLabel,
      category: input.category ?? null,
      occasion: input.occasion ?? null,
      contentType: input.contentType ?? null,
      duration: input.duration ?? null,
      publishingMethod: input.publishingMethod ?? null,
      recipientLabel: input.recipientLabel ?? null,
      recipientUsername: input.recipientUsername ?? null,
      shoutoutMessage: input.shoutoutMessage ?? null,
      specialInstructions: input.specialInstructions ?? null,
      isAppearance: Boolean(input.isAppearance),
      instantBooking: Boolean(input.instantBooking),
      appearanceLocation: input.appearanceLocation ?? null,
      appearanceExpectation: input.appearanceExpectation ?? null,
      appearanceReference: input.appearanceReference ?? null,
      dayRate: asInt(input.dayRate),
      feedFee: asInt(input.feedFee),
      totalFee: asInt(input.totalFee),
      currency: input.currency?.trim() || "USD",
      requestedForAt: input.requestedForAt ?? null,
      deliverBy: input.deliverBy ?? null,
      detailsJson: input.detailsJson ?? undefined,
    },
  });
}

export function specialRequestToBookingPayload(
  request: {
    reference: string;
    status: string;
    requestLabel: string;
    occasion: string | null;
    contentType: string | null;
    duration: string | null;
    publishingMethod: string | null;
    totalFee: number;
    currency: string;
    deliverBy: Date | null;
  },
  creatorName: string,
): BookingConfirmationPayload {
  const statusLabel =
    request.status === "RECEIVED"
      ? "Received"
      : request.status === "ACCEPTED"
        ? "Accepted"
        : request.status === "IN_PROGRESS"
          ? "In Progress"
          : request.status === "DELIVERED"
            ? "Delivered"
            : request.status === "DECLINED"
              ? "Declined"
              : request.status === "CANCELLED"
                ? "Cancelled"
                : "Received";

  return {
    reference: request.reference,
    status: statusLabel,
    creatorName,
    bookingType: request.requestLabel,
    occasion: request.occasion || "—",
    contentType: request.contentType || "—",
    duration: request.duration || "—",
    publishingMethod: request.publishingMethod || "—",
    totalCharge: `${request.totalFee} ${request.currency}`,
    deliverBy: (request.deliverBy ?? new Date()).toISOString(),
  };
}

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export type MyBookingSummaryRow = {
  label: string;
  value: string;
};

export type MyBookingItem = {
  id: string;
  direction: "outbound" | "inbound";
  reference: string;
  status: string;
  statusLabel: string;
  requestLabel: string;
  category: string | null;
  contentType: string | null;
  totalLabel: string;
  createdAt: string;
  createdLabel: string;
  requestedForAt: string | null;
  deliverBy: string | null;
  deliverByLabel: string | null;
  acceptedAtLabel: string | null;
  declinedAtLabel: string | null;
  declineReason: string | null;
  summary: MyBookingSummaryRow[];
  creator: {
    id: string;
    name: string;
    handle: string;
    slug: string | null;
    avatarUrl: string | null;
    avatarInitials: string;
    avatarColor: string;
  };
  messagesHref: string | null;
};

function statusLabel(status: string) {
  switch (status) {
    case "RECEIVED":
      return "Received";
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

function formatDateTime(date: Date | null | undefined) {
  if (!date) return null;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function readable(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "—") return null;
  return trimmed;
}

function detailsRecord(detailsJson: unknown) {
  if (!detailsJson || typeof detailsJson !== "object" || Array.isArray(detailsJson)) {
    return null;
  }
  return detailsJson as Record<string, unknown>;
}

function buildSummary(request: {
  requestLabel: string;
  category: string | null;
  occasion: string | null;
  contentType: string | null;
  duration: string | null;
  publishingMethod: string | null;
  recipientLabel: string | null;
  recipientUsername: string | null;
  shoutoutMessage: string | null;
  specialInstructions: string | null;
  isAppearance: boolean;
  appearanceLocation: string | null;
  appearanceExpectation: string | null;
  appearanceReference: string | null;
  totalFee: number;
  currency: string;
  detailsJson: unknown;
}): MyBookingSummaryRow[] {
  const details = detailsRecord(request.detailsJson);
  const tone =
    typeof details?.tone === "string" ? readable(details.tone) : null;
  const contentSummary =
    typeof details?.contentSummary === "string" ? readable(details.contentSummary) : null;
  const formatDetails = contentSummary || readable(request.duration);

  const rows: Array<[string, string | null]> = [
    ["Booking type", readable(request.requestLabel)],
    ["Category", readable(request.category)],
    ["Occasion", readable(request.occasion)],
  ];

  if (request.isAppearance) {
    rows.push(
      ["Content type", readable(request.contentType) || "Live appearance"],
      ["Duration", readable(request.duration)],
      ["Delivery", readable(request.publishingMethod)],
      ["Location", readable(request.appearanceLocation)],
      ["Expectation", readable(request.appearanceExpectation)],
      ["Reference file", readable(request.appearanceReference)],
    );
  } else {
    rows.push(
      ["Formats", readable(request.contentType)],
      ["Tone", tone],
      ["Format details", formatDetails],
      ["Delivery", readable(request.publishingMethod)],
      ["Recipient", readable(request.recipientLabel)],
      ["Recipient username", readable(request.recipientUsername)],
      ["Message", readable(request.shoutoutMessage)],
      ["Special instructions", readable(request.specialInstructions)],
    );
  }

  rows.push(["Total charge", `${request.totalFee} ${request.currency}`]);

  return rows
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([label, value]) => ({ label, value }));
}

export async function listMySpecialRequestBookings(): Promise<MyBookingItem[] | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const outboundRequests = await prisma.specialRequest.findMany({
    where: { userId: user.id },
    orderBy: [{ createdAt: "desc" }],
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          handle: true,
          slug: true,
          avatarUrl: true,
          avatarInitials: true,
          avatarColor: true,
        },
      },
    },
  });

  const outbound = outboundRequests.map((request) => {
    const slug = request.creator.slug?.trim() || null;
    const params = new URLSearchParams();
    if (request.threadId) params.set("thread", request.threadId);
    if (slug) params.set("slug", slug);
    params.set("booking", request.id);
    params.set("focus", "latest");
    const messagesHref =
      request.threadId || slug ? `/feed/messages?${params.toString()}` : null;
    const details =
      request.detailsJson &&
      typeof request.detailsJson === "object" &&
      !Array.isArray(request.detailsJson)
        ? (request.detailsJson as Record<string, unknown>)
        : null;
    const declineReason =
      typeof details?.declineReason === "string" && details.declineReason.trim()
        ? details.declineReason.trim()
        : null;

    return {
      id: request.id,
      direction: "outbound",
      reference: request.reference,
      status: request.status,
      statusLabel: statusLabel(request.status),
      requestLabel: request.requestLabel,
      category: request.category,
      contentType: request.contentType,
      totalLabel: `${request.totalFee} ${request.currency}`,
      createdAt: request.createdAt.toISOString(),
      createdLabel: formatDate(request.createdAt),
      requestedForAt: request.requestedForAt?.toISOString() ?? null,
      deliverBy: request.deliverBy?.toISOString() ?? null,
      deliverByLabel: formatDateTime(request.deliverBy),
      acceptedAtLabel: formatDateTime(request.acceptedAt),
      declinedAtLabel: formatDateTime(request.declinedAt),
      declineReason,
      summary: buildSummary(request),
      creator: {
        id: request.creator.id,
        name: request.creator.name,
        handle: request.creator.handle,
        slug: request.creator.slug,
        avatarUrl: request.creator.avatarUrl,
        avatarInitials: request.creator.avatarInitials,
        avatarColor: request.creator.avatarColor,
      },
      messagesHref,
    };
  });

  const inboundRequests = await prisma.specialRequest.findMany({
    where: {
      creator: { userId: user.id },
    },
    orderBy: [{ createdAt: "desc" }],
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          handle: true,
          profile: {
            select: {
              slug: true,
              displayName: true,
              avatarUrl: true,
              avatarInitials: true,
              avatarColor: true,
            },
          },
        },
      },
    },
  });

  const inbound = inboundRequests.map((request) => {
    const profile = request.user.profile;
    const fullName =
      `${request.user.firstName?.trim() || ""} ${request.user.lastName?.trim() || ""}`.trim();
    const requesterName =
      profile?.displayName?.trim() || fullName || request.user.handle?.trim() || "Requester";
    const requesterHandle = request.user.handle?.trim() || "@requester";
    const requesterSlug = profile?.slug?.trim() || null;
    const requesterInitials =
      profile?.avatarInitials?.trim() ||
      requesterName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0] || "")
        .join("")
        .toUpperCase() ||
      "RQ";
    const requesterAvatarColor = profile?.avatarColor?.trim() || "#6b9fff";
    const requesterAvatarUrl = profile?.avatarUrl?.trim() || null;
    const params = new URLSearchParams();
    if (requesterSlug) params.set("slug", requesterSlug);
    params.set("booking", request.id);
    params.set("focus", "latest");
    const messagesHref = requesterSlug ? `/feed/messages?${params.toString()}` : null;
    const details =
      request.detailsJson &&
      typeof request.detailsJson === "object" &&
      !Array.isArray(request.detailsJson)
        ? (request.detailsJson as Record<string, unknown>)
        : null;
    const declineReason =
      typeof details?.declineReason === "string" && details.declineReason.trim()
        ? details.declineReason.trim()
        : null;

    return {
      id: request.id,
      direction: "inbound" as const,
      reference: request.reference,
      status: request.status,
      statusLabel: statusLabel(request.status),
      requestLabel: request.requestLabel,
      category: request.category,
      contentType: request.contentType,
      totalLabel: `${request.totalFee} ${request.currency}`,
      createdAt: request.createdAt.toISOString(),
      createdLabel: formatDate(request.createdAt),
      requestedForAt: request.requestedForAt?.toISOString() ?? null,
      deliverBy: request.deliverBy?.toISOString() ?? null,
      deliverByLabel: formatDateTime(request.deliverBy),
      acceptedAtLabel: formatDateTime(request.acceptedAt),
      declinedAtLabel: formatDateTime(request.declinedAt),
      declineReason,
      summary: buildSummary(request),
      creator: {
        id: request.user.id,
        name: requesterName,
        handle: requesterHandle,
        slug: requesterSlug,
        avatarUrl: requesterAvatarUrl,
        avatarInitials: requesterInitials,
        avatarColor: requesterAvatarColor,
      },
      messagesHref,
    } satisfies MyBookingItem;
  });

  return [...inbound, ...outbound];
}

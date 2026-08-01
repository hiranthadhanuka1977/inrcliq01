import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export type MyBookingSummaryRow = {
  label: string;
  value: string;
};

export type MyBookingItem = {
  id: string;
  reference: string;
  status: string;
  statusLabel: string;
  requestLabel: string;
  category: string | null;
  contentType: string | null;
  totalLabel: string;
  createdLabel: string;
  deliverBy: string | null;
  deliverByLabel: string | null;
  acceptedAtLabel: string | null;
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

  const requests = await prisma.specialRequest.findMany({
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

  return requests.map((request) => {
    const slug = request.creator.slug?.trim() || null;
    const params = new URLSearchParams();
    if (request.threadId) params.set("thread", request.threadId);
    if (slug) params.set("slug", slug);
    params.set("booking", request.id);
    params.set("focus", "latest");
    const messagesHref =
      request.threadId || slug ? `/feed/messages?${params.toString()}` : null;

    return {
      id: request.id,
      reference: request.reference,
      status: request.status,
      statusLabel: statusLabel(request.status),
      requestLabel: request.requestLabel,
      category: request.category,
      contentType: request.contentType,
      totalLabel: `${request.totalFee} ${request.currency}`,
      createdLabel: formatDate(request.createdAt),
      deliverBy: request.deliverBy?.toISOString() ?? null,
      deliverByLabel: formatDateTime(request.deliverBy),
      acceptedAtLabel: formatDateTime(request.acceptedAt),
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
}

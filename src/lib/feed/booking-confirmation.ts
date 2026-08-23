export const BOOKING_MESSAGE_PREFIX = "__ICQ_BOOKING__:";
export const BOOKING_NOTE_PREFIX = "__ICQ_BOOKING_NOTE__:";

export type BookingConfirmationPayload = {
  reference: string;
  status: string;
  creatorName: string;
  bookingType: string;
  occasion: string;
  contentType: string;
  duration: string;
  publishingMethod: string;
  totalCharge: string;
  deliverBy: string;
  specialRequestId?: string;
};

export type BookingNotePayload = {
  kind: "accepted" | "declined" | "delivered";
  reference: string;
  creatorName: string;
  specialRequestId?: string;
  title?: string;
  body?: string;
  reason?: string;
  deliverBy?: string;
  /** Optional counter-offer when accepting a non-instant request. */
  offerPrice?: number;
  currency?: string;
  note?: string;
  attachmentUrl?: string;
  attachmentName?: string;
};

export function generateBookingReference() {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.floor(100 + Math.random() * 900).toString();
  return `${rand}${stamp}`;
}

export function encodeBookingMessage(payload: BookingConfirmationPayload) {
  return `${BOOKING_MESSAGE_PREFIX}${JSON.stringify(payload)}`;
}

export function parseBookingMessage(body: string): BookingConfirmationPayload | null {
  if (!body.startsWith(BOOKING_MESSAGE_PREFIX)) return null;
  try {
    const parsed = JSON.parse(body.slice(BOOKING_MESSAGE_PREFIX.length)) as BookingConfirmationPayload;
    if (!parsed?.reference || !parsed?.deliverBy) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function encodeBookingNote(payload: BookingNotePayload) {
  return `${BOOKING_NOTE_PREFIX}${JSON.stringify(payload)}`;
}

export function parseBookingNote(body: string): BookingNotePayload | null {
  if (!body.startsWith(BOOKING_NOTE_PREFIX)) return null;
  try {
    const parsed = JSON.parse(body.slice(BOOKING_NOTE_PREFIX.length)) as BookingNotePayload;
    if (!parsed?.reference) return null;
    if (parsed.kind !== "accepted" && parsed.kind !== "declined" && parsed.kind !== "delivered") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function bookingMessagePreview(
  payload: BookingConfirmationPayload,
  viewer: "requester" | "provider" = "requester",
  requesterName?: string,
) {
  const name = resolveCreatorName(payload);
  if (viewer === "provider") {
    const by = requesterName?.trim() || "a fan";
    return `Requested by ${by} · ${payload.reference}`;
  }
  return `Requested · ${name} · ${payload.reference}`;
}

export function bookingNotePreview(payload: BookingNotePayload) {
  const name = payload.creatorName?.trim() || "the creator";
  const first = name.split(" ")[0];
  if (payload.kind === "declined") {
    return `Declined by ${first} · ${payload.reference}`;
  }
  if (payload.kind === "delivered") {
    return `Delivered by ${first} · ${payload.reference}`;
  }
  return `Accepted by ${first} · ${payload.reference}`;
}

export function bookingReceivedTitle(payload: BookingConfirmationPayload) {
  return `Requested from ${resolveCreatorName(payload)}`;
}

export function resolveCreatorName(
  payload: BookingConfirmationPayload,
  fallbackName?: string | null,
) {
  const fromPayload = payload.creatorName?.trim();
  if (fromPayload && fromPayload.toLowerCase() !== "creator") return fromPayload;
  const fromFallback = fallbackName?.trim();
  if (fromFallback) return fromFallback;
  return "the creator";
}

export function withCreatorName(
  payload: BookingConfirmationPayload,
  fallbackName: string,
): BookingConfirmationPayload {
  const existing = payload.creatorName?.trim();
  if (existing && existing.toLowerCase() !== "creator") {
    return payload;
  }
  return {
    ...payload,
    creatorName: fallbackName.trim() || existing || "the creator",
  };
}

export function parseDeliveryDeadline(when: string | undefined, fallbackDays = 7): string {
  if (when?.trim()) {
    const normalized = when.replace("·", " ").replace(/\s+/g, " ").trim();
    const parsed = Date.parse(normalized);
    if (!Number.isNaN(parsed) && parsed > Date.now()) {
      return new Date(parsed).toISOString();
    }
  }
  return new Date(Date.now() + fallbackDays * 24 * 60 * 60 * 1000).toISOString();
}

/** Human-readable deliver-by datetime for listings, details, and chat cards. */
export function formatDeliverByLabel(deliverByIso: string | null | undefined) {
  if (!deliverByIso?.trim()) return null;
  const date = new Date(deliverByIso);
  if (Number.isNaN(date.getTime())) return null;
  // Fixed locale so SSR and client hydration always match.
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getCountdownParts(deliverByIso: string, now = Date.now()) {
  const target = Date.parse(deliverByIso);
  if (Number.isNaN(target)) {
    return { days: 0, hours: 0, minutes: 0 };
  }
  const remaining = Math.max(0, target - now);
  const totalMinutes = Math.floor(remaining / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return { days, hours, minutes };
}

export function extractContentType(content: string | undefined) {
  if (!content?.trim()) return "—";
  const types: string[] = [];
  if (/\btext\b/i.test(content)) types.push("Text");
  if (/\baudio\b/i.test(content)) types.push("Audio");
  if (/\bvideo\b/i.test(content)) types.push("Video");
  if (types.length > 0) return types.join(" · ");
  if (/\bappearance\b/i.test(content) || /\blive\b/i.test(content)) {
    return "Live appearance";
  }
  return content.split(/[·+]/)[0]?.trim() || content.trim();
}

export function extractDuration(content: string | undefined, duration?: string) {
  if (duration?.trim() && duration.trim() !== "—") return duration.trim();
  if (!content?.trim()) return "—";

  const formatDetails = content
    .split(/\s*\+\s*/)
    .map((part) => part.trim())
    .filter((part) => /^(text|audio|video)\b/i.test(part));
  if (formatDetails.length > 0) {
    return formatDetails.join(" · ");
  }

  const matches = [
    ...content.matchAll(/(\d+\s*(?:seconds?|minutes?|mins?|hours?|hrs?))/gi),
  ].map((match) => match[1]);
  if (matches.length > 0) return matches.join(" · ");
  return "—";
}

export function extractTone(content: string | undefined) {
  if (!content?.trim()) return null;
  const first = content.split(/\s*\+\s*/)[0]?.trim();
  if (!first || /^(text|audio|video)\b/i.test(first)) return null;
  if (/^(live appearance|select format)$/i.test(first)) return null;
  return first;
}

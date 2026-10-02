import { createHash } from "node:crypto";
import { z } from "zod";
import { normalizePostText } from "@/lib/feed/create-post";
import { FEED_CATEGORIES } from "@/lib/feed/feed";
import { formatTimecode } from "@/lib/feed/audio-time";
import type { FeedAudio, FeedMedia } from "@/types/feed/feed";
import type { PartnerFieldError } from "@/lib/partner-api/http";

export const PARTNER_MAX_BODY_BYTES = 100_000;
export const PARTNER_TEXT_MAX_LENGTH = 2000;
export const PARTNER_MAX_IMAGES = 6;
export const PARTNER_MAX_TAGS = 8;
export const PARTNER_BACKDATE_LIMIT_DAYS = 30;
const CLOCK_SKEW_MS = 5 * 60_000;
const TAG_PATTERN = /^#?[A-Za-z0-9_]{1,30}$/;

const categories: readonly string[] = FEED_CATEGORIES;

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

const httpsUrl = z.string().trim().max(2048).refine(isHttpsUrl, { error: "Must be an https URL." });
const altText = z.string().trim().min(1, { error: "Alt text is required." }).max(300);
const image = z.strictObject({ url: httpsUrl, alt: altText });

const partnerPostSchema = z
  .strictObject({
    externalId: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[A-Za-z0-9._:-]+$/, { error: "Use letters, digits, '.', '_', ':' or '-' only." }),
    creator: z.strictObject({ handle: z.string().trim().min(1).max(60) }),
    category: z
      .string()
      .trim()
      .toLowerCase()
      .refine((value) => categories.includes(value), {
        error: `Must be one of: ${categories.join(", ")}.`,
      }),
    text: z.string().max(PARTNER_TEXT_MAX_LENGTH).optional(),
    tags: z
      .array(z.string().trim().regex(TAG_PATTERN, { error: "Use 1-30 letters, digits or '_'." }))
      .max(PARTNER_MAX_TAGS)
      .optional(),
    membersOnly: z.boolean().optional(),
    postedAt: z.iso.datetime({ offset: true, error: "Must be an ISO 8601 date-time." }).optional(),
    media: z
      .strictObject({
        images: z.array(image).min(1).max(PARTNER_MAX_IMAGES).optional(),
        video: z
          .strictObject({ url: httpsUrl, posterUrl: httpsUrl, posterAlt: altText.optional() })
          .optional(),
        audio: z
          .strictObject({
            url: httpsUrl,
            title: z.string().trim().min(1).max(200),
            durationSeconds: z.number().int().min(1).max(86_400),
            thumbnail: image,
          })
          .optional(),
      })
      .optional(),
    location: z
      .strictObject({
        label: z.string().trim().min(1).max(120),
        lat: z.number().min(-90).max(90).optional(),
        lng: z.number().min(-180).max(180).optional(),
      })
      .optional(),
    feeling: z
      .strictObject({
        kind: z.enum(["feeling", "activity"]),
        emoji: z.string().trim().min(1).max(16),
        label: z.string().trim().min(1).max(60),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    const kinds = value.media
      ? (["images", "video", "audio"] as const).filter((kind) => value.media?.[kind] !== undefined)
      : [];
    if (value.media && kinds.length !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["media"],
        message: "Send exactly one of media.images, media.video or media.audio.",
      });
    }
    if (!normalizePostText(value.text) && kinds.length === 0) {
      ctx.addIssue({ code: "custom", path: ["text"], message: "Send text, media, or both." });
    }
    if (value.postedAt) {
      const postedAt = new Date(value.postedAt).getTime();
      if (postedAt > Date.now() + CLOCK_SKEW_MS) {
        ctx.addIssue({ code: "custom", path: ["postedAt"], message: "Can't be in the future." });
      } else if (postedAt < Date.now() - PARTNER_BACKDATE_LIMIT_DAYS * 86_400_000) {
        ctx.addIssue({
          code: "custom",
          path: ["postedAt"],
          message: `Can't be more than ${PARTNER_BACKDATE_LIMIT_DAYS} days in the past.`,
        });
      }
    }
  });

type PartnerPostBody = z.infer<typeof partnerPostSchema>;

export type PartnerPostInput = {
  externalId: string;
  creatorHandle: string;
  category: string;
  text: string;
  tags: string[];
  membersOnly: boolean;
  postedAt: Date | null;
  media: FeedMedia | null;
  audio: FeedAudio | null;
  payloadHash: string;
};

function formatPath(path: PropertyKey[]) {
  return path.reduce<string>((out, part) => {
    if (typeof part === "number") return `${out}[${part}]`;
    return out ? `${out}.${String(part)}` : String(part);
  }, "");
}

function toFieldErrors(issues: z.core.$ZodIssue[]): PartnerFieldError[] {
  return issues.flatMap((issue) => {
    if (issue.code === "unrecognized_keys") {
      return issue.keys.map((key) => ({ field: formatPath([...issue.path, key]), message: "Unknown field." }));
    }
    const missing = issue.code === "invalid_type" && issue.message.endsWith("received undefined");
    return [{ field: formatPath(issue.path) || "body", message: missing ? "Required." : issue.message }];
  });
}

function normalizeTags(body: PartnerPostBody, text: string) {
  const source = body.tags ?? text.match(/#[A-Za-z0-9_]{1,30}/g) ?? [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of source) {
    const tag = raw.replace(/^#/, "");
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(`#${tag}`);
  }
  return tags.slice(0, PARTNER_MAX_TAGS);
}

function buildMedia(body: PartnerPostBody): FeedMedia | null {
  const images = body.media?.images ?? [];
  const video = body.media?.video;
  if (!images.length && !video && !body.location && !body.feeling) return null;

  return {
    type: video ? "video" : images.length > 1 ? "collage" : "image",
    images: video ? [{ url: video.posterUrl, alt: video.posterAlt ?? "Video poster" }] : images,
    video_url: video?.url ?? null,
    use_sample_video: false,
    location: body.location,
    feeling: body.feeling,
  };
}

function buildAudio(body: PartnerPostBody): FeedAudio | null {
  const audio = body.media?.audio;
  if (!audio) return null;
  return {
    title: audio.title,
    thumbnail: audio.thumbnail,
    current_time: "0:00",
    duration: formatTimecode(audio.durationSeconds),
    progress: 0,
    audio_url: audio.url,
  };
}

export function parsePartnerPost(
  raw: unknown,
): { ok: true; input: PartnerPostInput } | { ok: false; fields: PartnerFieldError[] } {
  const result = partnerPostSchema.safeParse(raw);
  if (!result.success) return { ok: false, fields: toFieldErrors(result.error.issues) };

  const body = result.data;
  const text = normalizePostText(body.text);
  return {
    ok: true,
    input: {
      externalId: body.externalId,
      creatorHandle: body.creator.handle.replace(/^@/, ""),
      category: body.category,
      text,
      tags: normalizeTags(body, text),
      membersOnly: body.membersOnly ?? false,
      postedAt: body.postedAt ? new Date(body.postedAt) : null,
      media: buildMedia(body),
      audio: buildAudio(body),
      payloadHash: createHash("sha256").update(JSON.stringify(body)).digest("hex"),
    },
  };
}

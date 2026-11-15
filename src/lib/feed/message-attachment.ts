import { isStoredUploadUrl } from "@/lib/uploads/store-upload";

export const MESSAGE_ATTACHMENT_PREFIX = "__ICQ_FILE__:";

const MAX_FILES = 4;
const MAX_NAME = 120;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export type MessageAttachmentFile = {
  url: string;
  name: string;
  mime: string;
  size: number;
};

export type MessageAttachmentPayload = {
  text: string;
  files: MessageAttachmentFile[];
};

function cleanName(value: string) {
  const base = value.replace(/[/\\]/g, " ").replace(/\s+/g, " ").trim();
  if (!base) return "Attachment";
  return base.length > MAX_NAME ? base.slice(0, MAX_NAME) : base;
}

function validFile(value: unknown): MessageAttachmentFile | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<MessageAttachmentFile>;
  const url = typeof row.url === "string" ? row.url.trim() : "";
  const mime = typeof row.mime === "string" ? row.mime.trim().toLowerCase() : "";
  const size = typeof row.size === "number" ? row.size : 0;
  if (!url || !isStoredUploadUrl(url) || !url.includes("uploads/messages/")) return null;
  if (!ALLOWED_MIME.has(mime)) return null;
  if (!Number.isFinite(size) || size <= 0 || size > 8 * 1024 * 1024) return null;
  return {
    url,
    name: cleanName(typeof row.name === "string" ? row.name : "Attachment"),
    mime,
    size,
  };
}

export function encodeMessageAttachment(payload: MessageAttachmentPayload) {
  return `${MESSAGE_ATTACHMENT_PREFIX}${JSON.stringify({
    text: payload.text.trim(),
    files: payload.files,
  })}`;
}

export function parseMessageAttachment(body: string): MessageAttachmentPayload | null {
  if (!body.startsWith(MESSAGE_ATTACHMENT_PREFIX)) return null;
  try {
    const parsed = JSON.parse(body.slice(MESSAGE_ATTACHMENT_PREFIX.length)) as {
      text?: unknown;
      files?: unknown;
    };
    const files = Array.isArray(parsed.files)
      ? parsed.files.map(validFile).filter((file): file is MessageAttachmentFile => Boolean(file)).slice(0, MAX_FILES)
      : [];
    if (!files.length) return null;
    return {
      text: typeof parsed.text === "string" ? parsed.text.trim() : "",
      files,
    };
  } catch {
    return null;
  }
}

export function messageAttachmentPreview(payload: MessageAttachmentPayload) {
  const text = payload.text.replace(/\s+/g, " ").trim();
  if (text) return text.length > 140 ? `${text.slice(0, 137)}…` : text;
  if (payload.files.length === 1) {
    const name = payload.files[0]?.name || "Attachment";
    return name.length > 120 ? `Attachment: ${name.slice(0, 117)}…` : `Attachment: ${name}`;
  }
  return `Sent ${payload.files.length} attachments`;
}

export function sanitizeMessageAttachments(value: unknown): MessageAttachmentFile[] {
  if (!Array.isArray(value)) return [];
  return value.map(validFile).filter((file): file is MessageAttachmentFile => Boolean(file)).slice(0, MAX_FILES);
}

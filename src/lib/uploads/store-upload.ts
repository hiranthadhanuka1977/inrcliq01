import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { put } from "@vercel/blob";

function usesBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** True for local `/uploads/...` paths or Vercel Blob public URLs. */
export function isStoredUploadUrl(url: string) {
  const value = url.trim();
  if (!value) return false;
  if (/^\/uploads\//.test(value)) return true;
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname.endsWith(".public.blob.vercel-storage.com") ||
        parsed.hostname.endsWith(".blob.vercel-storage.com"))
    );
  } catch {
    return false;
  }
}

/**
 * Persist an uploaded file.
 * - With `BLOB_READ_WRITE_TOKEN` (required on Vercel): stores in Vercel Blob and
 *   returns a public HTTPS URL.
 * - Locally without that token: writes under `public/uploads/...` and returns a
 *   site-relative `/uploads/...` path.
 */
export async function storeUploadedFile(options: {
  folder: string;
  filename: string;
  bytes: Buffer;
  contentType?: string;
}): Promise<{ url: string }> {
  const folder = options.folder.replace(/^\/+|\/+$/g, "").replaceAll("\\", "/");
  const pathname = `${folder}/${options.filename}`;

  if (usesBlobStorage()) {
    const blob = await put(pathname, options.bytes, {
      access: "public",
      contentType: options.contentType || undefined,
      addRandomSuffix: false,
    });
    return { url: blob.url };
  }

  if (process.env.VERCEL) {
    throw new Error(
      "File uploads on Vercel require BLOB_READ_WRITE_TOKEN. Add a Blob store in the Vercel project and set the token.",
    );
  }

  const absoluteDir = join(process.cwd(), "public", folder);
  mkdirSync(absoluteDir, { recursive: true });
  writeFileSync(join(absoluteDir, options.filename), options.bytes);
  return { url: `/${pathname}` };
}

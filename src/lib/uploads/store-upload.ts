import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { put } from "@vercel/blob";

function usesBlobStorage() {
  // Long-lived token (legacy / external) or OIDC-connected store on Vercel.
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
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
 * - On Vercel with a connected Blob store (BLOB_STORE_ID / OIDC or BLOB_READ_WRITE_TOKEN):
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
      "File uploads on Vercel require a connected Blob store. Link inrcliq01-blob to this project under Storage.",
    );
  }

  const absoluteDir = join(process.cwd(), "public", folder);
  mkdirSync(absoluteDir, { recursive: true });
  writeFileSync(join(absoluteDir, options.filename), options.bytes);
  return { url: `/${pathname}` };
}

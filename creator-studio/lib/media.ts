export function mainOrigin() {
  return (process.env.MAIN_ORIGIN || "http://localhost:3002").replace(/\/$/, "");
}

export function isStudioMediaUrl(url: string) {
  if (url.startsWith("/uploads/studio/")) return true;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname.endsWith(".public.blob.vercel-storage.com") ||
        parsed.hostname.endsWith(".blob.vercel-storage.com"))
    );
  } catch {
    return false;
  }
}

export function mediaSrc(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${mainOrigin()}${url}`;
}

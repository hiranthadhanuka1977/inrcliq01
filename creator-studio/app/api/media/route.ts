import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getStudioContext } from "../../../lib/context";
import { isStudioMediaUrl } from "../../../lib/media";

export const runtime = "nodejs";

const TYPES: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  aac: "audio/aac",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(request: Request) {
  const ctx = await getStudioContext();
  if (ctx.kind !== "ok") {
    return NextResponse.json({ error: "Sign in from InrCliq to preview media." }, { status: 401 });
  }

  const src = new URL(request.url).searchParams.get("src") ?? "";
  if (!isStudioMediaUrl(src)) {
    return NextResponse.json({ error: "That file is not available." }, { status: 404 });
  }

  if (src.startsWith("/uploads/studio/")) {
    const name = path.basename(src);
    if (!/^[a-f0-9]{32}\.[a-z0-9]+$/i.test(name)) {
      return NextResponse.json({ error: "That file is not available." }, { status: 404 });
    }
    const extension = name.split(".").pop()?.toLowerCase() ?? "";
    const type = TYPES[extension];
    if (!type) return NextResponse.json({ error: "That file is not available." }, { status: 404 });
    try {
      const bytes = await readFile(path.join(process.cwd(), "..", "public", "uploads", "studio", name));
      return new NextResponse(new Uint8Array(bytes), {
        headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600" },
      });
    } catch {
      return NextResponse.json({ error: "That file is not available." }, { status: 404 });
    }
  }

  const remote = await fetch(src);
  if (!remote.ok || !remote.body) {
    return NextResponse.json({ error: "That file is not available." }, { status: 404 });
  }
  const type = remote.headers.get("content-type") || "application/octet-stream";
  return new NextResponse(remote.body, {
    headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600" },
  });
}

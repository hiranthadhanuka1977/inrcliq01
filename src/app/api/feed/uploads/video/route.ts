import { issueSignedToken } from "@vercel/blob";
import {
  handleUpload,
  handleUploadPresigned,
  type HandleUploadBody,
  type HandleUploadPresignedBody,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import {
  VIDEO_CONTENT_TYPES,
  VIDEO_MAX_BYTES,
  VIDEO_PATHNAME_PATTERN,
} from "@/lib/uploads/video-limits";
import { videoUploadMode } from "@/lib/uploads/video-upload";

class InvalidVideoPathError extends Error {}

function assertVideoPathname(pathname: string) {
  if (!VIDEO_PATHNAME_PATTERN.test(pathname)) {
    throw new InvalidVideoPathError("Unsupported file format. Choose an MP4, MOV, or WebM video.");
  }
}

const blobConstraints = {
  allowedContentTypes: [...VIDEO_CONTENT_TYPES],
  maximumSizeInBytes: VIDEO_MAX_BYTES,
};

/** Tells the composer how to send the video: straight to Blob, or in chunks to this app. */
export async function GET() {
  const { error } = await requireSessionUser();
  if (error) return error;
  return NextResponse.json({ mode: videoUploadMode() });
}

/** Issues Vercel Blob upload credentials for `upload()` / `uploadPresigned()` from `@vercel/blob/client`. */
export async function POST(request: Request) {
  const { error } = await requireSessionUser();
  if (error) return error;

  const mode = videoUploadMode();
  if (mode !== "blob-token" && mode !== "blob-presigned") {
    return NextResponse.json(
      { error: "Direct video uploads are not available here. Use the chunked upload." },
      { status: 400 },
    );
  }

  try {
    const body = (await request.json()) as HandleUploadBody | HandleUploadPresignedBody;

    if (mode === "blob-token") {
      const result = await handleUpload({
        request,
        body: body as HandleUploadBody,
        onBeforeGenerateToken: async (pathname) => {
          assertVideoPathname(pathname);
          return { ...blobConstraints, addRandomSuffix: true };
        },
      });
      return NextResponse.json(result);
    }

    const result = await handleUploadPresigned({
      request,
      body: body as HandleUploadPresignedBody,
      getSignedToken: async (pathname) => {
        assertVideoPathname(pathname);
        const token = await issueSignedToken({ pathname, operations: ["put"], ...blobConstraints });
        return { token, urlOptions: { ...blobConstraints, addRandomSuffix: true } };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof InvalidVideoPathError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/feed/uploads/video error", error);
    return NextResponse.json({ error: "Unable to start the video upload." }, { status: 500 });
  }
}

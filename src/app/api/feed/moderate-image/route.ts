import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { formatImageModerationError } from "@/lib/moderation/evaluate-predictions";
import {
  createModerationPassToken,
  hashImageBytes,
} from "@/lib/moderation/moderation-pass-token";
import { moderateImageBytes } from "@/lib/moderation/server-image-moderation";

export const maxDuration = 60;

const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const isImage = IMAGE_TYPES.has(file.type) || file.type.startsWith("image/") || !file.type;
    if (!isImage) {
      return NextResponse.json({ error: "Choose a photo to check." }, { status: 400 });
    }

    if (file.size <= 0 || file.size > IMAGE_MAX_BYTES) {
      return NextResponse.json({ error: "Image must be 8MB or smaller." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const fileHash = hashImageBytes(bytes);
    const result = await moderateImageBytes(bytes);

    if (!result.allowed) {
      return NextResponse.json({
        ok: false,
        result,
        error: formatImageModerationError(result),
      });
    }

    let passToken: string | undefined;
    try {
      passToken = createModerationPassToken(user.id, fileHash);
    } catch (tokenError) {
      console.error("Moderation pass token creation failed", tokenError);
    }

    return NextResponse.json({
      ok: true,
      result,
      passToken,
    });
  } catch (err) {
    console.error("POST /api/feed/moderate-image error", err);
    return NextResponse.json({ error: "Unable to verify this photo." }, { status: 500 });
  }
}

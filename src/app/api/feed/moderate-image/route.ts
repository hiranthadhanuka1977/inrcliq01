import { NextResponse } from "next/server";
import { isLiveBackend } from "@/lib/backend/config";
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

  // Live mode skips this pre-check, deliberately and temporarily.
  //
  // It is the mock's own Azure Content Safety screen, and its credentials are
  // not set here — so it answered "temporarily unavailable" for every photo and
  // refused it. Because the composer screens *before* uploading, the upload was
  // never attempted and nothing reached our API: this route is where the call
  // you saw stopping at :3000 ended.
  //
  // Mock mode keeps the gate exactly as it was — there the prototype is the only
  // thing between a file and the feed.
  //
  // KNOWN GAP, not covered anywhere: our backend does not screen image bytes
  // either. It screens post text and approves media on publish. So in live mode
  // images are unscreened end to end. That is fine for testing the feed API and
  // must be closed on the backend before launch — see FEED_TESTING.md §6.
  if (isLiveBackend()) {
    return NextResponse.json({ ok: true, result: { allowed: true } });
  }

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

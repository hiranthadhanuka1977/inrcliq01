import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { CreatorRequestsContent } from "@/lib/feed/special-requests";
import { getSessionUser } from "@/lib/session";
import {
  categoryHasRequiredImage,
  pruneOrphanGalleryItems,
  recomputeStartingRange,
  serviceHasRequiredImage,
  type SellerServiceRequestsConfig,
} from "@/lib/seller/service-requests-helpers";
import { requireSellerSpecialRequestsIdentity } from "@/lib/seller/identity";
import {
  getSellerServiceRequestsConfigForUser,
  writeSellerServiceRequestsConfigForUser,
} from "@/lib/seller/service-requests-store";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identity = await requireSellerSpecialRequestsIdentity();
  if (!identity) {
    return NextResponse.json(
      { error: "Special Requests are not enabled for this account." },
      { status: 403 },
    );
  }

  const config = await getSellerServiceRequestsConfigForUser(identity.userId);
  if (!config) {
    return NextResponse.json(
      { error: "Service requests catalog not found for this account." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    slug: identity.slug,
    previewHref: `/feed/profile/${identity.slug}/requests`,
    ...config,
  });
}

function isValidContent(value: unknown): value is CreatorRequestsContent {
  if (!value || typeof value !== "object") return false;
  const content = value as CreatorRequestsContent;
  return Array.isArray(content.categories) && typeof content.startingRange === "string";
}

function validateRequiredImages(content: CreatorRequestsContent): string | null {
  const missingGallery = content.gallery.find((item) => !item.src?.trim());
  if (missingGallery) {
    return `Gallery slide “${missingGallery.caption || missingGallery.id}” needs a background image.`;
  }

  for (const category of content.categories) {
    // Empty draft categories can be saved without an image; they stay hidden publicly
    // until the seller finishes setup on the manage page.
    if (category.services.length === 0) continue;

    if (!categoryHasRequiredImage(category)) {
      return `Category “${category.title || category.id}” needs a background image.`;
    }
    for (const service of category.services) {
      if (!serviceHasRequiredImage(service)) {
        return service.media.kind === "audio"
          ? `Offering “${service.label || service.id}” needs an audio sample.`
          : `Offering “${service.label || service.id}” needs a preview image.`;
      }
    }
  }

  return null;
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identity = await requireSellerSpecialRequestsIdentity();
  if (!identity) {
    return NextResponse.json(
      { error: "Special Requests are not enabled for this account." },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json().catch(() => null)) as {
      enabled?: boolean;
      content?: CreatorRequestsContent;
      autoStartingRange?: boolean;
    } | null;

    if (!body || typeof body.enabled !== "boolean" || !isValidContent(body.content)) {
      return NextResponse.json({ error: "Invalid service requests payload." }, { status: 400 });
    }

    let content = pruneOrphanGalleryItems(body.content);
    if (body.enabled) {
      const imageError = validateRequiredImages(content);
      if (imageError) {
        return NextResponse.json({ error: imageError }, { status: 400 });
      }
    }

    if (body.autoStartingRange !== false) {
      content = {
        ...content,
        startingRange: recomputeStartingRange(content),
      };
    }

    const saved = await writeSellerServiceRequestsConfigForUser(identity.userId, {
      enabled: body.enabled,
      content,
      updatedAt: new Date().toISOString(),
    } satisfies SellerServiceRequestsConfig);

    revalidatePath(`/feed/profile/${identity.slug}/requests`);
    revalidatePath(`/feed/profile/${identity.slug}/requests/choose`);
    revalidatePath(`/feed/profile/${identity.slug}`);

    return NextResponse.json({
      slug: identity.slug,
      previewHref: `/feed/profile/${identity.slug}/requests`,
      ...saved,
    });
  } catch (error) {
    console.error("seller/service-requests PUT error", error);
    return NextResponse.json({ error: "Unable to save service requests." }, { status: 500 });
  }
}

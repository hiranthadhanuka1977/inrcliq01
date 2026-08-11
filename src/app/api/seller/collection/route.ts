import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session";
import {
  productHasCoreFields,
  type SellerCollectionConfig,
} from "@/lib/seller/collection-helpers";
import { requireSellerCollectionIdentity } from "@/lib/seller/identity";
import {
  getSellerCollectionForUser,
  writeSellerCollectionForUser,
} from "@/lib/seller/collection-store";
import type { CollectionProduct } from "@/types/feed/collection";

function isValidProduct(value: unknown): value is CollectionProduct {
  if (!value || typeof value !== "object") return false;
  const product = value as CollectionProduct;
  return (
    typeof product.id === "string" &&
    typeof product.name === "string" &&
    (product.kind === "physical" || product.kind === "digital")
  );
}

function isValidConfig(value: unknown): value is SellerCollectionConfig {
  if (!value || typeof value !== "object") return false;
  const config = value as SellerCollectionConfig;
  return (
    typeof config.enabled === "boolean" &&
    typeof config.title === "string" &&
    typeof config.subtitle === "string" &&
    Array.isArray(config.products) &&
    config.products.every(isValidProduct)
  );
}

function validateEnabledCollection(config: SellerCollectionConfig): string | null {
  if (!config.enabled) return null;
  const liveCandidates = config.products.filter(
    (product) => product.active !== false && product.published === true,
  );
  if (liveCandidates.length === 0) {
    return "Publish at least one product before showing Collection on your profile.";
  }
  for (const product of liveCandidates) {
    if (!productHasCoreFields(product)) {
      return `Product “${product.name || product.id}” needs a name, price, description, and image before it can go live.`;
    }
  }
  return null;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identity = await requireSellerCollectionIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Seller profile not found." }, { status: 403 });
  }

  try {
    const config = await getSellerCollectionForUser(
      identity.userId,
      identity.slug,
      identity.displayName,
    );
    return NextResponse.json({
      slug: identity.slug,
      previewHref: `/feed/profile/${identity.slug}/collection`,
      ...config,
    });
  } catch (error) {
    console.error("seller/collection GET error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load collection." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identity = await requireSellerCollectionIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Seller profile not found." }, { status: 403 });
  }

  try {
    const body = (await request.json().catch(() => null)) as SellerCollectionConfig | null;
    if (!isValidConfig(body)) {
      return NextResponse.json({ error: "Invalid collection payload." }, { status: 400 });
    }

    const enabledError = validateEnabledCollection(body);
    if (enabledError) {
      return NextResponse.json({ error: enabledError }, { status: 400 });
    }

    const saved = await writeSellerCollectionForUser(
      identity.userId,
      identity.slug,
      identity.displayName,
      body,
    );

    revalidatePath(`/feed/profile/${identity.slug}`);
    revalidatePath(`/feed/profile/${identity.slug}/collection`);
    for (const product of saved.products) {
      revalidatePath(`/feed/profile/${identity.slug}/collection/${product.id}`);
    }

    return NextResponse.json({
      slug: identity.slug,
      previewHref: `/feed/profile/${identity.slug}/collection`,
      ...saved,
    });
  } catch (error) {
    console.error("seller/collection PUT error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save collection." },
      { status: 500 },
    );
  }
}

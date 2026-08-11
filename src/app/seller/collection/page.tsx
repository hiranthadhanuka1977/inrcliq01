import { SellerCollectionView } from "@/components/seller/SellerCollectionView";
import { requireSellerCollectionIdentity } from "@/lib/seller/identity";
import { getSellerCollectionForUser } from "@/lib/seller/collection-store";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

function parseTab(value: string | undefined): "products" | "setup" | undefined {
  if (value === "products" || value === "setup") return value;
  return undefined;
}

export default async function SellerCollectionPage({ searchParams }: PageProps) {
  const identity = await requireSellerCollectionIdentity();
  if (!identity) {
    redirect("/");
  }

  const config = await getSellerCollectionForUser(
    identity.userId,
    identity.slug,
    identity.displayName,
  );
  const { tab } = await searchParams;

  return (
    <SellerCollectionView
      slug={identity.slug}
      previewHref={`/feed/profile/${identity.slug}/collection`}
      initialConfig={config}
      initialTab={parseTab(tab)}
    />
  );
}

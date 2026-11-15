import { CollectionBoard } from "../../components/manage/CollectionBoard";
import { loadFailure } from "../../components/load-failure";
import { MainApiError, mainJson, onMain } from "../../lib/main";
import { getSellerProSession } from "../../lib/session";
import type { CollectionPayload } from "../../lib/types";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ filter?: string; view?: string; section?: string }>;
};

function parseFilter(value: string | undefined) {
  if (value === "live" || value === "draft" || value === "paused") return value;
  return "all" as const;
}

export default async function CollectionPage({ searchParams }: PageProps) {
  if (!(await getSellerProSession())) return null;

  try {
    const data = await mainJson<CollectionPayload>("/api/seller/collection");
    const query = await searchParams;
    return (
      <CollectionBoard
        config={data}
        previewHref={onMain(data.previewHref)}
        filter={parseFilter(query.filter)}
        view={query.view === "list" ? "list" : "tiles"}
        section={query.section === "storefront" ? "storefront" : "products"}
      />
    );
  } catch (error) {
    if (error instanceof MainApiError || error instanceof Error) {
      return loadFailure(error, "Collection");
    }
    throw error;
  }
}

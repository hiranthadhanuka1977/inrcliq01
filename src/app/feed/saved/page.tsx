import { redirect } from "next/navigation";
import SavedFeed from "@/components/feed/SavedFeed";
import { getSavedFeedData } from "@/lib/feed/feed";

export const metadata = {
  title: "Saved · INRCLIQ",
};

export default async function SavedPage() {
  const saved = await getSavedFeedData();
  if (!saved) redirect("/");

  return <SavedFeed items={saved.items} profileHref={saved.profileHref} />;
}

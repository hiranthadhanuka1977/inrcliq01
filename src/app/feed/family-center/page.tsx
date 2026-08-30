import { redirect } from "next/navigation";
import FamilyCenterView from "@/components/feed/family/FamilyCenterView";
import { getFamilyCenterForSession } from "@/lib/guardian/family-center";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Family Center · INRCLIQ",
};

export default async function FamilyCenterPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const data = await getFamilyCenterForSession();
  if (!data) redirect("/feed/me");

  return (
    <FamilyCenterView
      data={data}
      firstName={user.firstName?.trim() || null}
    />
  );
}

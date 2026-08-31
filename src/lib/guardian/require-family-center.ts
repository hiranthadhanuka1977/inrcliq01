import { redirect } from "next/navigation";
import { getFamilyCenterForSession } from "@/lib/guardian/family-center";
import { getSessionUser } from "@/lib/session";

export async function requireFamilyCenterSession() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const data = await getFamilyCenterForSession();
  if (!data) redirect("/feed/me");

  return { user, data };
}

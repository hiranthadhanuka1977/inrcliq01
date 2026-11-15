import { redirect } from "next/navigation";
import ChangeNameView from "@/components/feed/account/ChangeNameView";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import { getAccountProfile } from "@/lib/feed/account-profile";

export const metadata = {
  title: "Change name · INRCLIQ",
};

function nameParts(fullName: string, firstName: string | null, lastName: string | null) {
  const first = firstName?.trim() ?? "";
  const last = lastName?.trim() ?? "";
  const combined = [first, last].filter(Boolean).join(" ");
  if (combined && combined === fullName.trim()) {
    return { first, last };
  }
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    first: parts[0] ?? first,
    last: parts.slice(1).join(" "),
  };
}

export default async function ChangeNamePage() {
  const profile = await getAccountProfile();
  if (!profile) redirect("/");

  const names = nameParts(profile.fullName, profile.firstName, profile.lastName);

  return (
    <div className="app-shell">
      <LeftNav firstName={profile.firstName} />
      <ChangeNameView firstName={names.first} lastName={names.last} />
      <MobileNav />
    </div>
  );
}

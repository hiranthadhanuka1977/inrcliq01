import { redirect } from "next/navigation";

export default function SettingsFeedPage() {
  redirect("/settings/dashboard?tab=feed");
}

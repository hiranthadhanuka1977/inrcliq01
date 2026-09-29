import { SettingsPills } from "@/components/settings/SettingsPills";
import { UsersTable } from "@/components/settings/UsersTable";
import { countSettingsUsersByGroup, listSettingsUsers } from "@/lib/settings/users";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function SettingsUsersPage({ searchParams }: PageProps) {
  const group = (await searchParams).tab === "demo" ? "demo" : "members";
  const [users, counts] = await Promise.all([listSettingsUsers(group), countSettingsUsersByGroup()]);

  const pills = [
    { id: "members", label: `Users (${counts.members})`, href: "/settings/users" },
    { id: "demo", label: `Demo users (${counts.demo})`, href: "/settings/users?tab=demo" },
  ];

  return (
    <UsersTable
      key={group}
      users={users}
      group={group}
      pills={<SettingsPills pills={pills} active={group} label="User groups" />}
    />
  );
}

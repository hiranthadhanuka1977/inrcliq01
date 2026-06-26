import { UsersTable } from "@/components/settings/UsersTable";
import { listSettingsUsers } from "@/lib/settings/users";

export default async function SettingsUsersPage() {
  const users = await listSettingsUsers();

  return <UsersTable users={users} />;
}

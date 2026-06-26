import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getOnboardingRedirect } from "@/lib/auth/onboarding";
import { getLatestParentRequest } from "@/lib/auth/parent-invite";
import { getSessionUser } from "@/lib/session";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const parentRequest =
    user.accountType === "MINOR" ? await getLatestParentRequest(user.id) : null;
  const onboardingRedirect = getOnboardingRedirect(user, parentRequest);

  if (onboardingRedirect !== "/home") {
    redirect(onboardingRedirect);
  }

  return (
    <main style={{ maxWidth: 720, margin: "4rem auto", padding: "0 1.5rem" }}>
      <h1>Welcome to InrCliq</h1>
      <p style={{ marginTop: "1rem", color: "#717171" }}>
        Signed in as <strong>{user.email}</strong>
      </p>
      <p style={{ marginTop: "2rem" }}>
        This is a placeholder home screen. Feed and guardian flows will be migrated next.
      </p>
      <div style={{ marginTop: "2rem" }}>
        <LogoutButton />
      </div>
    </main>
  );
}

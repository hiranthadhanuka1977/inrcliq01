import { LogoutButton } from "@/components/auth/LogoutButton";

export function WelcomePlaceholder({ email }: { email?: string | null }) {
  return (
    <main style={{ maxWidth: 720, margin: "4rem auto", padding: "0 1.5rem" }}>
      <h1>Welcome to InrCliq</h1>
      {email ? (
        <p style={{ marginTop: "1rem", color: "#717171" }}>
          Signed in as <strong>{email}</strong>
        </p>
      ) : null}
      <p style={{ marginTop: "2rem" }}>
        This is a placeholder home screen. Feed and guardian flows will be migrated next.
      </p>
      <div style={{ marginTop: "2rem" }}>
        <LogoutButton />
      </div>
    </main>
  );
}

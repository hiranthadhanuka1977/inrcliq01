import { redirect } from "next/navigation";
import { AuthCenterLayout } from "@/components/auth/AuthCenterLayout";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (token) {
    redirect(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
  }

  if (error === "invalid") {
    return (
      <AuthCenterLayout>
        <h1>Link expired or invalid</h1>
        <p className="subtitle mt-2">This verification link is invalid or has expired.</p>
        <a href="/api/auth/restart-signup" className="btn btn--primary mt-8">
          Back to signup
        </a>
      </AuthCenterLayout>
    );
  }

  return (
    <AuthCenterLayout>
      <h1>Invalid verification link</h1>
      <p className="subtitle mt-2">This link is missing required information.</p>
      <a href="/api/auth/restart-signup" className="btn btn--primary mt-8">
        Back to signup
      </a>
    </AuthCenterLayout>
  );
}

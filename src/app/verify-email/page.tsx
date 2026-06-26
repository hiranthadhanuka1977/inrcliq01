import Link from "next/link";
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
        <p className="auth-switch mt-8">
          <Link href="/signup" className="link-btn">
            Back to signup
          </Link>
        </p>
      </AuthCenterLayout>
    );
  }

  return (
    <AuthCenterLayout>
      <h1>Invalid verification link</h1>
      <p className="subtitle mt-2">This link is missing required information.</p>
      <p className="auth-switch mt-8">
        <Link href="/signup" className="link-btn">
          Back to signup
        </Link>
      </p>
    </AuthCenterLayout>
  );
}

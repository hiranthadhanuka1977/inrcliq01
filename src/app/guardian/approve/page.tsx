import { Suspense } from "react";
import { AuthPathShell } from "@/components/auth/AuthPathShell";
import { GuardianFlow } from "@/components/guardian/GuardianFlow";

export default function GuardianApprovePage() {
  return (
    <Suspense
      fallback={
        <AuthPathShell showTopLogo>
          <section className="screen page-centered">
            <div className="page-centered__inner text-center">
              <p className="subtitle mt-2">Loading…</p>
            </div>
          </section>
        </AuthPathShell>
      }
    >
      <GuardianFlow />
    </Suspense>
  );
}

import { Suspense } from "react";
import { AuthPageCentered } from "@/components/auth/AuthPageCentered";
import { GuardianFlow } from "@/components/guardian/GuardianFlow";

export default function GuardianApprovePage() {
  return (
    <Suspense
      fallback={
        <AuthPageCentered innerClassName="text-center">
          <p className="subtitle mt-2">Loading…</p>
        </AuthPageCentered>
      }
    >
      <GuardianFlow />
    </Suspense>
  );
}

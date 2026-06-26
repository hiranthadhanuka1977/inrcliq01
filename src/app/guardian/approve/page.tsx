import { Suspense } from "react";
import { GuardianFlow } from "@/components/guardian/GuardianFlow";

export default function GuardianApprovePage() {
  return (
    <Suspense
      fallback={
        <section className="screen page-centered">
          <div className="page-centered__inner text-center">
            <p className="subtitle mt-2">Loading…</p>
          </div>
        </section>
      }
    >
      <GuardianFlow />
    </Suspense>
  );
}

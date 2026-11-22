"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { CaptureSuccessModal } from "@/components/guardian/GuardianModals";
import { ParentIdentityVerifyStep } from "@/components/guardian/ParentIdentityVerifyStep";
import { ParentFaceScanStep, ParentIdCaptureStep } from "@/components/guardian/ParentIdVerifySteps";
import { AgeIdVerifyStep } from "@/components/identity/AgeIdVerifyStep";
import { SellerIdentityReviewStep } from "@/components/seller/SellerIdentityReviewStep";
import type { IdDocType } from "@/lib/guardian/constants";

type Step = "verify-intro" | "id-capture" | "face-scan" | "verifying" | "review" | "complete";

export function AdultIdentityVerifyView({
  email,
  fullName,
  dateOfBirthDisplay,
  country,
  identityRejected,
}: {
  email: string;
  fullName: string;
  dateOfBirthDisplay: string;
  country: string | null;
  identityRejected: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("verify-intro");
  const [idDocType, setIdDocType] = useState<IdDocType>("passport");
  const [idCapturedOpen, setIdCapturedOpen] = useState(false);
  const [selfieCapturedOpen, setSelfieCapturedOpen] = useState(false);
  const [error, setError] = useState(
    identityRejected
      ? "Identity verification was rejected. You cannot continue until it is accepted."
      : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showReview = useCallback(() => setStep("review"), []);

  const finishVerification = useCallback(async () => {
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/feed/me/identity", { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to save age verification.");
        return;
      }
      setStep("complete");
    } catch {
      setError("Unable to save age verification.");
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  if (step === "complete") {
    return (
      <button type="button" className="adult-verify-done" onClick={() => router.push("/feed/me")}>
        <span className="adult-verify-done__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3 5 6v6c0 4.2 2.8 7.2 7 9 4.2-1.8 7-4.8 7-9V6l-7-3Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </span>
        <h1>Verification complete</h1>
        <p>Your age is confirmed. This account is marked 18 or older.</p>
        <span className="adult-verify-done__cta">Back to profile</span>
      </button>
    );
  }

  return (
    <section className="seller-age-verify">
      <CaptureSuccessModal
        open={idCapturedOpen}
        title="ID captured successfully"
        subtitle="Now let's take your selfie"
        buttonLabel="Let's take it"
        onContinue={() => {
          setIdCapturedOpen(false);
          setStep("face-scan");
        }}
      />
      <CaptureSuccessModal
        open={selfieCapturedOpen}
        title="Selfie captured successfully"
        buttonLabel="Review and continue"
        onContinue={() => {
          setSelfieCapturedOpen(false);
          setStep("verifying");
        }}
      />

      {step === "verify-intro" ? (
        <AgeIdVerifyStep
          onBack={() => router.push("/feed/me/completion")}
          onStart={() => {
            if (identityRejected) return;
            setStep("id-capture");
          }}
          disabled={identityRejected}
        />
      ) : null}

      {step === "id-capture" ? (
        <ParentIdCaptureStep
          docType={idDocType}
          onDocTypeChange={setIdDocType}
          onBack={() => setStep("verify-intro")}
          onCaptured={() => setIdCapturedOpen(true)}
        />
      ) : null}

      {step === "face-scan" ? (
        <ParentFaceScanStep
          onBack={() => setStep("id-capture")}
          onCaptured={() => setSelfieCapturedOpen(true)}
        />
      ) : null}

      {error ? (
        <p className="field-error mt-4" role="alert">
          {error}
        </p>
      ) : null}

      {step === "verifying" ? (
        <ParentIdentityVerifyStep parentEmail={email} onComplete={showReview} />
      ) : null}

      {step === "review" ? (
        <SellerIdentityReviewStep
          fullName={fullName}
          dateOfBirthDisplay={dateOfBirthDisplay}
          country={country}
          email={email}
          idDocType={idDocType}
          isSubmitting={isSubmitting}
          continueLabel="Finish verification"
          note="Check these details. They were read from the ID you just captured."
          onContinue={() => void finishVerification()}
        />
      ) : null}
    </section>
  );
}

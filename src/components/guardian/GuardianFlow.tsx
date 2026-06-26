"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChildRequestSidebar } from "@/components/guardian/ChildRequestSidebar";
import { CaptureSuccessModal, DeclineModal } from "@/components/guardian/GuardianModals";
import { ParentAccountStep } from "@/components/guardian/ParentAccountStep";
import { ParentApprovedStep } from "@/components/guardian/ParentApprovedStep";
import { ParentConsentStep, ParentDeclinedStep } from "@/components/guardian/ParentConsentStep";
import { ParentFaceScanStep, ParentIdCaptureStep } from "@/components/guardian/ParentIdVerifySteps";
import { ParentIdentityReviewStep } from "@/components/guardian/ParentIdentityReviewStep";
import { ParentIdentityVerifyStep } from "@/components/guardian/ParentIdentityVerifyStep";
import { ParentProtectionStep } from "@/components/guardian/ParentProtectionStep";
import { ParentSignupLayout } from "@/components/guardian/ParentSignupLayout";
import { ParentVerifyIntroStep } from "@/components/guardian/ParentVerifyIntroStep";
import type { GuardianContext } from "@/lib/auth/guardian-flow";
import type { IdDocType, ProtectionTier } from "@/lib/guardian/constants";

type GuardianStep =
  | "consent"
  | "account"
  | "verify-intro"
  | "id-capture"
  | "face-scan"
  | "verifying"
  | "review"
  | "protection"
  | "approved"
  | "declined";

type ApprovedSummary = {
  childFullName: string;
  childFirstName: string;
  childHandle: string | null;
  childAge: number | null;
  parentEmail: string;
  protectionLevel: ProtectionTier;
  activatedAt: string;
};

export function GuardianFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [context, setContext] = useState<GuardianContext | null>(null);
  const [step, setStep] = useState<GuardianStep>("consent");
  const [idDocType, setIdDocType] = useState<IdDocType>("passport");
  const [guardianCountry, setGuardianCountry] = useState<string | null>(null);
  const [reviewLocation, setReviewLocation] = useState({
    childLivesWithGuardian: true,
    childLocationCountry: null as string | null,
    childLocationRegion: null as string | null,
  });
  const [approvedSummary, setApprovedSummary] = useState<ApprovedSummary | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [idCapturedOpen, setIdCapturedOpen] = useState(false);
  const [selfieCapturedOpen, setSelfieCapturedOpen] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setLoadError("This link is missing required information.");
      return;
    }

    async function loadContext() {
      try {
        const response = await fetch(`/api/guardian/context?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (!response.ok) {
          setLoadError(data.error ?? "Invalid or expired approval link.");
          return;
        }

        setContext(data);
        setIdDocType(data.idDocType ?? "passport");
        setGuardianCountry(data.guardianCountry);
      } catch {
        setLoadError("Unable to load approval request.");
      } finally {
        setLoading(false);
      }
    }

    loadContext();
  }, [token]);

  const openDecline = useCallback(() => setDeclineOpen(true), []);

  async function handleDeclineConfirm() {
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/guardian/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const data = await response.json();
        setSubmitError(data.error ?? "Unable to decline request.");
        return;
      }

      setDeclineOpen(false);
      setStep("declined");
    } catch {
      setSubmitError("Unable to decline request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConsentApprove() {
    if (!context) return;

    if (context.isReturningGuardian) {
      setIsSubmitting(true);
      setSubmitError("");

      try {
        const response = await fetch("/api/guardian/quick-approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();

        if (!response.ok) {
          setSubmitError(data.error ?? "Unable to approve request.");
          return;
        }

        setApprovedSummary({
          childFullName: context.child.fullName,
          childFirstName: data.childFirstName ?? context.child.firstName,
          childHandle: context.child.handle,
          childAge: context.child.age,
          parentEmail: context.parentEmail,
          protectionLevel: data.protectionLevel ?? "standard",
          activatedAt: new Date().toISOString(),
        });
        setStep("approved");
      } catch {
        setSubmitError("Unable to approve request.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setStep("account");
  }

  async function handleAccountSubmit(data: {
    password: string;
    country: string;
    region: string | null;
  }) {
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/guardian/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: data.password,
          country: data.country,
          region: data.region,
          idDocType,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setSubmitError(result.error ?? "Unable to create guardian account.");
        return;
      }

      setGuardianCountry(data.country);
      setStep("verify-intro");
    } catch {
      setSubmitError("Unable to create guardian account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleProtectionApprove(protectionLevel: ProtectionTier) {
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/guardian/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          protectionLevel,
          childLivesWithGuardian: reviewLocation.childLivesWithGuardian,
          childLocationCountry: reviewLocation.childLocationCountry,
          childLocationRegion: reviewLocation.childLocationRegion,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setSubmitError(data.error ?? "Unable to complete approval.");
        return;
      }

      setApprovedSummary({
        childFullName: data.childFullName,
        childFirstName: data.childFirstName,
        childHandle: data.childHandle,
        childAge: data.childAge,
        parentEmail: data.parentEmail,
        protectionLevel: data.protectionLevel,
        activatedAt: data.activatedAt,
      });
      setStep("approved");
    } catch {
      setSubmitError("Unable to complete approval.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleVerifyComplete = useCallback(() => setStep("review"), []);

  if (loading) {
    return (
      <section className="screen page-centered">
        <div className="page-centered__inner text-center">
          <p className="subtitle mt-2">Loading…</p>
        </div>
      </section>
    );
  }

  if (loadError || !context) {
    return (
      <section className="screen page-centered">
        <div className="page-centered__inner text-center">
          <h1>Invalid approval link</h1>
          <p className="subtitle mt-2">{loadError || "This approval link is no longer valid."}</p>
        </div>
      </section>
    );
  }

  const modals = (
    <>
      <DeclineModal
        open={declineOpen}
        childFirstName={context.child.firstName}
        onCancel={() => setDeclineOpen(false)}
        onConfirm={handleDeclineConfirm}
        isSubmitting={isSubmitting}
      />
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
    </>
  );

  if (step === "consent") {
    return (
      <>
        {modals}
        <ParentConsentStep
          child={context.child}
          onApprove={handleConsentApprove}
          onDecline={openDecline}
          isSubmitting={isSubmitting}
        />
        {submitError ? (
          <p className="field-error text-center mt-4" role="alert">
            {submitError}
          </p>
        ) : null}
      </>
    );
  }

  if (step === "declined") {
    return (
      <ParentDeclinedStep
        childFirstName={context.child.firstName}
        onDone={() => router.push("/")}
      />
    );
  }

  if (step === "approved" && approvedSummary) {
    return (
      <ParentSignupLayout stepperStep={5} completeCurrentStep single>
        <ParentApprovedStep
          {...approvedSummary}
          onDone={() => router.push("/")}
        />
      </ParentSignupLayout>
    );
  }

  const stepperStep =
    step === "account"
      ? 1
      : ["verify-intro", "id-capture", "face-scan", "verifying"].includes(step)
        ? 2
        : step === "review"
          ? 3
          : step === "protection"
            ? 4
            : 5;

  const single = step !== "account";
  const sidebar =
    step === "account" ? (
      <ChildRequestSidebar child={context.child} onDecline={openDecline} />
    ) : undefined;

  return (
    <>
      {modals}
      <ParentSignupLayout
        stepperStep={stepperStep}
        single={single}
        protection={step === "protection"}
        screenId={step === "account" ? "screen-PAR-02" : undefined}
        sidebar={sidebar}
      >
        {step === "account" ? (
          <ParentAccountStep
            parentEmail={context.parentEmail}
            onBack={() => setStep("consent")}
            onSubmit={handleAccountSubmit}
            isSubmitting={isSubmitting}
            error={submitError}
          />
        ) : null}

        {step === "verify-intro" ? (
          <ParentVerifyIntroStep
            onBack={() => setStep("account")}
            onStart={() => setStep("id-capture")}
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

        {step === "verifying" ? (
          <ParentIdentityVerifyStep
            parentEmail={context.parentEmail}
            onComplete={handleVerifyComplete}
          />
        ) : null}

        {step === "review" ? (
          <ParentIdentityReviewStep
            child={context.child}
            parentName={context.simulatedParentName}
            parentDob={context.simulatedParentDob}
            idDocType={idDocType}
            guardianCountry={guardianCountry}
            idNumber={context.simulatedIdNumber}
            onContinue={(data) => {
              setReviewLocation(data);
              setStep("protection");
            }}
          />
        ) : null}

        {step === "protection" ? (
          <ParentProtectionStep
            child={context.child}
            onApprove={handleProtectionApprove}
            isSubmitting={isSubmitting}
            error={submitError}
          />
        ) : null}
      </ParentSignupLayout>
    </>
  );
}

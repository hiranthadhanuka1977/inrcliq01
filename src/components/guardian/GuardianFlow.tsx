"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChildRequestSidebar } from "@/components/guardian/ChildRequestSidebar";
import { CaptureSuccessModal, DeclineModal } from "@/components/guardian/GuardianModals";
import { ParentApprovedStep } from "@/components/guardian/ParentApprovedStep";
import { ParentAccountStep } from "@/components/guardian/ParentAccountStep";
import { ParentConsentStep, ParentDeclinedStep } from "@/components/guardian/ParentConsentStep";
import { ParentFaceScanStep, ParentIdCaptureStep } from "@/components/guardian/ParentIdVerifySteps";
import { ParentIdentityReviewStep } from "@/components/guardian/ParentIdentityReviewStep";
import { ParentIdentityVerifyStep } from "@/components/guardian/ParentIdentityVerifyStep";
import { ParentProtectionStep } from "@/components/guardian/ParentProtectionStep";
import { AuthPageCentered } from "@/components/auth/AuthPageCentered";
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

type GuardianCompletion = {
  childFullName: string;
  childFirstName: string;
  childHandle: string | null;
  childAge: number | null;
  parentEmail: string;
  protectionLevel: ProtectionTier;
  activatedAt: string;
};


function redirectParentToLanding() {
  window.location.assign("/?parentDone=1");
}

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
  const [declineOpen, setDeclineOpen] = useState(false);
  const [idCapturedOpen, setIdCapturedOpen] = useState(false);
  const [selfieCapturedOpen, setSelfieCapturedOpen] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [completion, setCompletion] = useState<GuardianCompletion | null>(null);

  const applyLoadedContext = useCallback((data: GuardianContext) => {
    setContext(data);
    setIdDocType(data.idDocType ?? "passport");
    setGuardianCountry(data.guardianCountry);
    setLoadError("");
  }, []);

  const reloadContext = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`/api/guardian/context?token=${encodeURIComponent(token)}`);
      const data = await response.json();

      if (!response.ok) {
        setLoadError(data.error ?? "Invalid or expired approval link.");
        return;
      }

      applyLoadedContext(data);
    } catch {
      setLoadError("Unable to load approval request.");
    }
  }, [applyLoadedContext, token]);

  useEffect(() => {
    let active = true;

    async function loadInitialContext() {
      if (!token) {
        if (!active) return;
        setLoading(false);
        setLoadError("This link is missing required information.");
        return;
      }

      try {
        const response = await fetch(`/api/guardian/context?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (!active) return;
        if (!response.ok) {
          setLoadError(data.error ?? "Invalid or expired approval link.");
          return;
        }

        applyLoadedContext(data);
      } catch {
        if (active) {
          setLoadError("Unable to load approval request.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadInitialContext();
    return () => {
      active = false;
    };
  }, [applyLoadedContext, token]);

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

    if (context.authenticatedGuardian) {
      setStep("account");
      return;
    }

    if (context.isReturningGuardian) {
      setStep("protection");
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

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setSubmitError("Unable to log out.");
        return;
      }
      await reloadContext();
      setStep("account");
    } catch {
      setSubmitError("Unable to log out.");
    } finally {
      setIsLoggingOut(false);
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

      setCompletion({
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
      <AuthPageCentered innerClassName="text-center">
        <p className="subtitle mt-2">Loading…</p>
      </AuthPageCentered>
    );
  }

  if (loadError || !context) {
    return (
      <AuthPageCentered innerClassName="text-center">
        <h1>Invalid approval link</h1>
        <p className="subtitle mt-2">{loadError || "This approval link is no longer valid."}</p>
      </AuthPageCentered>
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

  if (step === "approved" && completion) {
    return (
      <ParentSignupLayout stepperStep={5} single completeCurrentStep>
        <ParentApprovedStep {...completion} onDone={redirectParentToLanding} />
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
        loginEmail={context.parentEmail}
        onLoginSuccess={async () => {
          await reloadContext();
        }}
      >
        {step === "account" ? (
          <ParentAccountStep
            parentEmail={context.parentEmail}
            existingGuardian={
              context.authenticatedGuardian
                ? context.authenticatedGuardianProfile ?? {
                    name: context.authenticatedGuardianName,
                    email: context.authenticatedGuardianEmail ?? context.parentEmail,
                    country: context.authenticatedGuardianCountry,
                    region: context.authenticatedGuardianRegion,
                    statusLabel: "Active",
                    emailVerified: true,
                    ageVerified: context.isReturningGuardian,
                    accountTypeLabel: "Guardian",
                  }
                : null
            }
            onContinueAsExistingGuardian={() => setStep("protection")}
            onLogout={handleLogout}
            onBack={() => setStep("consent")}
            onSubmit={handleAccountSubmit}
            isSubmitting={isSubmitting}
            isLoggingOut={isLoggingOut}
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

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  clearGuardianTabSession,
  guardianTabFetch,
  readGuardianTabSession,
  writeGuardianTabSession,
} from "@/lib/auth/guardian-tab-session";
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
  const tabSessionRef = useRef<string | null>(null);
  const approvalFetch = useCallback((input: RequestInfo | URL, init?: RequestInit) => {
    return guardianTabFetch(input, init, tabSessionRef.current);
  }, []);

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
    if (!token) return null;
    try {
      const response = await approvalFetch(`/api/guardian/context?token=${encodeURIComponent(token)}`);
      const data = await response.json();

      if (!response.ok) {
        setLoadError(data.error ?? "Invalid or expired approval link.");
        return null;
      }

      applyLoadedContext(data);
      return data as GuardianContext;
    } catch {
      setLoadError("Unable to load approval request.");
      return null;
    }
  }, [applyLoadedContext, approvalFetch, token]);

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
        const response = await approvalFetch(`/api/guardian/context?token=${encodeURIComponent(token)}`);
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

    tabSessionRef.current = readGuardianTabSession();
    void loadInitialContext();
    return () => {
      active = false;
    };
  }, [applyLoadedContext, approvalFetch, token]);

  const openDecline = useCallback(() => setDeclineOpen(true), []);

  async function handleDeclineConfirm() {
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const response = await approvalFetch("/api/guardian/decline", {
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

  function continueAsLoggedInAccount() {
    if (!context) return;
    setSubmitError("");

    if (context.identityRejected) {
      setSubmitError(
        "Identity verification was rejected. You cannot approve a child until it is accepted.",
      );
      return;
    }

    if (context.requiresIdentityVerification) {
      setGuardianCountry(context.authenticatedGuardianCountry ?? context.guardianCountry);
      setStep("verify-intro");
      return;
    }

    setStep("protection");
  }

  async function handleAccountSubmit(data: {
    password: string;
    country: string;
    region: string | null;
  }) {
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const response = await approvalFetch("/api/guardian/account", {
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
      const response = await approvalFetch("/api/guardian/session", { method: "DELETE" });
      if (!response.ok) {
        setSubmitError("Unable to log out.");
        return;
      }
      tabSessionRef.current = null;
      clearGuardianTabSession();
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
      const response = await approvalFetch("/api/guardian/complete", {
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

  const handleVerifyComplete = useCallback(async () => {
    setSubmitError("");
    try {
      const response = await approvalFetch("/api/guardian/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, idDocType }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSubmitError(data.error ?? "Unable to save identity verification.");
        setStep("face-scan");
        return;
      }
      setStep("review");
    } catch {
      setSubmitError("Unable to save identity verification.");
      setStep("face-scan");
    }
  }, [approvalFetch, idDocType, token]);

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
          token={token}
          requiresActivationCode={context.requiresActivationCode}
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

  const loggedInAccount = context.authenticatedGuardian
    ? {
        name: context.authenticatedGuardianProfile?.name ?? context.authenticatedGuardianName,
        email:
          context.authenticatedGuardianProfile?.email ??
          context.authenticatedGuardianEmail ??
          context.parentEmail,
      }
    : null;

  if (step === "approved" && completion) {
    return (
      <ParentSignupLayout
        stepperStep={5}
        single
        completeCurrentStep
        loggedInAccount={loggedInAccount}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      >
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
        loggedInAccount={loggedInAccount}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        onLoginSuccess={async (sessionToken) => {
          tabSessionRef.current = sessionToken;
          writeGuardianTabSession(sessionToken);
          const data = await reloadContext();
          if (!data) return;
          if (!data.authenticatedGuardian) {
            setSubmitError("Log in with the email this request was sent to, then continue.");
            return;
          }
          if (data.identityRejected) {
            setSubmitError(
              "Identity verification was rejected. You cannot approve a child until it is accepted.",
            );
            return;
          }
          setSubmitError("");
        }}
      >
        {step === "account" ? (
          <ParentAccountStep
            parentEmail={context.parentEmail}
            requiresIdentityVerification={context.requiresIdentityVerification}
            identityRejected={context.identityRejected}
            existingGuardian={
              context.authenticatedGuardian
                ? context.authenticatedGuardianProfile ?? {
                    name: context.authenticatedGuardianName,
                    email: context.authenticatedGuardianEmail ?? context.parentEmail,
                    country: context.authenticatedGuardianCountry,
                    region: context.authenticatedGuardianRegion,
                    statusLabel: "Active",
                    emailVerified: true,
                    ageVerified: !context.requiresIdentityVerification,
                    dateOfBirthDisplay: null,
                    accountTypeLabel: "Guardian",
                  }
                : null
            }
            onContinueAsExistingGuardian={continueAsLoggedInAccount}
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

        {submitError && step !== "account" && step !== "protection" ? (
          <p className="field-error mt-4" role="alert">
            {submitError}
          </p>
        ) : null}

        {step === "review" ? (
          <ParentIdentityReviewStep
            child={context.child}
            parentName={context.authenticatedGuardianProfile?.name ?? context.simulatedParentName}
            parentDob={
              context.authenticatedGuardianProfile?.dateOfBirthDisplay ?? context.simulatedParentDob
            }
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

"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { CaptureSuccessModal } from "@/components/guardian/GuardianModals";
import { ParentIdentityVerifyStep } from "@/components/guardian/ParentIdentityVerifyStep";
import { ParentFaceScanStep, ParentIdCaptureStep } from "@/components/guardian/ParentIdVerifySteps";
import { AgeIdVerifyStep } from "@/components/identity/AgeIdVerifyStep";
import { SellerIdentityReviewStep } from "@/components/seller/SellerIdentityReviewStep";
import {
  AgeCheckArt,
  ExclusiveArt,
  MembershipArt,
  MerchArt,
  ServicesArt,
} from "@/components/seller/SellerIllustrations";
import type { IdDocType } from "@/lib/guardian/constants";

type Step = "consent" | "verify-intro" | "id-capture" | "face-scan" | "verifying" | "review";

export function SellerMembershipVerifyView({
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
  const [step, setStep] = useState<Step>("consent");
  const [agreed, setAgreed] = useState(false);
  const [idDocType, setIdDocType] = useState<IdDocType>("passport");
  const [idCapturedOpen, setIdCapturedOpen] = useState(false);
  const [selfieCapturedOpen, setSelfieCapturedOpen] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showReview = useCallback(() => setStep("review"), []);

  const finishAndPay = useCallback(async () => {
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/seller/membership/identity", { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to save age verification.");
        return;
      }
      router.push("/seller/membership/checkout");
    } catch {
      setError("Unable to save age verification.");
    } finally {
      setIsSubmitting(false);
    }
  }, [router]);

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

      {step === "consent" ? (
        <div className="seller-age-verify__page">
          <header className="seller-age-verify__intro">
            <p className="seller-verify__eyebrow">Verified membership</p>
            <h1 className="seller-verify__title">Verify your account</h1>
            <p className="seller-verify__lead">
              Before you pay, we confirm you are 18 or older. That is what opens selling, bookings,
              and payouts to a wider fan base.
            </p>
          </header>

          <div className="seller-age-verify__why">
            <AgeCheckArt />
            <div>
              <h2>Why we verify</h2>
              <ul>
                <li>
                  <strong>Selling is for adults.</strong> Merchandise, subscriptions, and paid
                  requests can only run on an account we have checked as 18 or older.
                </li>
                <li>
                  <strong>Fans need a real person.</strong> An ID matched to a selfie shows the
                  account belongs to you, so buyers know who they are paying.
                </li>
                <li>
                  <strong>One standard.</strong> It is the same ID and selfie check used when a
                  guardian approves a child.
                </li>
              </ul>
            </div>
          </div>

          <section className="seller-age-verify__unlock" aria-labelledby="seller-age-unlock-title">
            <h2 id="seller-age-unlock-title">What you can do once verified</h2>
            <ul>
              <li>
                <MerchArt />
                <h3>Sell to a wider fan base</h3>
                <p>
                  A verified storefront is easier for new fans to find. They can buy physical merch
                  and downloads from your profile, not only people who already follow you.
                </p>
              </li>
              <li>
                <ServicesArt />
                <h3>Offer services</h3>
                <p>
                  Fans book personalized text, audio, or video. You set the price, the format, and
                  when it is delivered.
                </p>
              </li>
              <li>
                <MembershipArt />
                <h3>Fan subscriptions</h3>
                <p>
                  A monthly membership gives fans a way to support you and stay close to the work
                  you publish.
                </p>
              </li>
              <li>
                <ExclusiveArt />
                <h3>Exclusive drops</h3>
                <p>
                  Members-only posts and releases stay behind your verified creator tools, so the
                  people who pay see them first.
                </p>
              </li>
            </ul>
          </section>

          <div className="seller-age-verify__consent">
            <label className="seller-age-verify__check">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
                disabled={identityRejected}
              />
              <span>I agree to complete age verification with an ID and a selfie.</span>
            </label>
            {identityRejected ? (
              <p className="field-error" role="alert">
                Identity verification was rejected. You cannot subscribe until it is accepted.
              </p>
            ) : null}
            <div className="seller-age-verify__actions">
              <button type="button" className="btn btn--secondary" onClick={() => router.push("/seller")}>
                Back
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={!agreed || identityRejected}
                onClick={() => setStep("verify-intro")}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {step === "verify-intro" ? (
        <AgeIdVerifyStep
          onBack={() => setStep("consent")}
          onStart={() => setStep("id-capture")}
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

      {error && step !== "consent" ? (
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
          onContinue={() => void finishAndPay()}
        />
      ) : null}
    </section>
  );
}

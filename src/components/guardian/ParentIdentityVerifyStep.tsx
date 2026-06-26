"use client";

import { useEffect, useState } from "react";
import { IDENTITY_VERIFY_STEP_DURATION_MS } from "@/lib/guardian/constants";

export function ParentIdentityVerifyStep({
  parentEmail,
  onComplete,
}: {
  parentEmail: string;
  onComplete: () => void;
}) {
  const [activeStep, setActiveStep] = useState(2);
  const [progress, setProgress] = useState(33);

  useEffect(() => {
    setActiveStep(2);
    setProgress(33);

    const raf = requestAnimationFrame(() => setProgress(100));

    const stepTimer = window.setTimeout(() => {
      setActiveStep(3);
    }, IDENTITY_VERIFY_STEP_DURATION_MS);

    const completeTimer = window.setTimeout(() => {
      setActiveStep(4);
      window.setTimeout(onComplete, 600);
    }, IDENTITY_VERIFY_STEP_DURATION_MS * 2);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(stepTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const steps = [
    { id: 1, text: "checking your document authority" },
    { id: 2, text: "Matching face to ID photo" },
    { id: 3, text: "Extracting identity details" },
  ];

  return (
    <div className="identity-verify mt-4">
      <h1 className="parent-signup__title identity-verify__title">Verifying your identity</h1>
      <p className="subtitle mt-2">This usually takes less than a minute. Please don&apos;t close this page.</p>

      <div
        className="identity-verify__progress mt-8"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-label="Identity verification progress"
      >
        <div
          className="identity-verify__progress-bar"
          style={{
            width: `${progress}%`,
            transition: `width ${IDENTITY_VERIFY_STEP_DURATION_MS * 2}ms linear`,
          }}
        />
      </div>

      <ol className="identity-verify__steps mt-6" aria-label="Verification steps">
        {steps.map((step) => {
          let stateClass = "is-pending";
          if (activeStep > 3 || step.id < activeStep) stateClass = "is-complete";
          else if (step.id === activeStep) stateClass = "is-active";

          return (
            <li key={step.id} className={`identity-verify__step ${stateClass}`}>
              <span className="identity-verify__step-dot" aria-hidden="true" />
              <span className="identity-verify__step-text">{step.text}</span>
            </li>
          );
        })}
      </ol>

      <p className="identity-verify__footer mt-8">
        Taking longer? We&apos;ll email you at <span>{parentEmail}</span> when its done.
      </p>
    </div>
  );
}

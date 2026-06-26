"use client";

import { useEffect, useRef } from "react";
import { getSignupProgressPercent, isSignupProgressVisible } from "@/lib/signup-progress";

export function SignupProgressBar({ step }: { step: number }) {
  const barRef = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef(step);

  const visible = isSignupProgressVisible(step);
  const percent = getSignupProgressPercent(step);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const prevStep = prevStepRef.current;
    prevStepRef.current = step;

    if (!visible) {
      bar.style.width = "0%";
      return;
    }

    const targetWidth = `${percent}%`;

    if (step === 2 && prevStep < 2) {
      bar.style.width = "0%";
      requestAnimationFrame(() => {
        bar.style.width = targetWidth;
      });
      return;
    }

    bar.style.width = targetWidth;
  }, [step, visible, percent]);

  return (
    <div
      className={`signup-progress${visible ? " is-visible" : ""}`}
      id="signup-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      aria-label="Signup progress"
      aria-hidden={!visible}
    >
      <div className="signup-progress__track">
        <div className="signup-progress__bar" id="signup-progress-bar" ref={barRef} />
      </div>
    </div>
  );
}

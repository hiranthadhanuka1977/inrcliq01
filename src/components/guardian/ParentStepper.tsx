const STEPS = [
  { step: 1, label: "Account" },
  { step: 2, label: "Verify" },
  { step: 3, label: "Review" },
  { step: 4, label: "Protection" },
  { step: 5, label: "Approved" },
] as const;

export function ParentStepper({
  currentStep,
  completeCurrent = false,
}: {
  currentStep: number;
  completeCurrent?: boolean;
}) {
  return (
    <nav className="parent-stepper" aria-label="Parent setup progress">
      <ol className="parent-stepper__list">
        {STEPS.map(({ step, label }) => {
          const isComplete = step < currentStep || (step === currentStep && completeCurrent);
          const isActive = step === currentStep && !completeCurrent;
          const classes = ["parent-stepper__item"];
          if (isComplete) classes.push("is-complete");
          if (isComplete && step === currentStep) classes.push("is-complete-current");
          if (isActive) classes.push("is-active");

          return (
            <li
              key={step}
              className={classes.join(" ")}
              data-step={step}
              aria-current={isActive || (completeCurrent && step === currentStep) ? "step" : undefined}
            >
              <span className="parent-stepper__bar" aria-hidden="true" />
              <span className="parent-stepper__label">
                <span className="sr-only">Step {step}:</span>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

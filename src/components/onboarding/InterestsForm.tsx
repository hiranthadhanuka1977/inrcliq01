"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const INTEREST_OPTIONS = [
  "Music",
  "Sports",
  "Gaming",
  "Fitness",
  "Food",
  "Travel",
  "Fashion",
  "Technology",
  "Finance",
  "Art",
  "Lifestyle",
  "Education",
];

export function InterestsForm() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleInterest(value: string) {
    setError("");
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  }

  async function submitInterests(skip = false) {
    if (isSubmitting) return;
    if (!skip && selected.length === 0) {
      setError("Please choose at least one interest.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(skip ? { skip: true } : { interests: selected }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Unable to save interests.");
        return;
      }

      router.push(data.redirectTo ?? "/home");
      router.refresh();
    } catch {
      setError("Unable to save interests.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="auth-split__step-header" aria-hidden="true" />
      <h1>Pick your interests</h1>
      <p className="subtitle mt-2">
        Choose topics you care about so we can personalize your InrCliq experience.
      </p>

      <section className="chips-section mt-8" aria-labelledby="interests-heading">
        <div className="chips-header">
          <span id="interests-heading">Select all that apply</span>
        </div>
        <div className="chips-row" role="group" aria-describedby="interests-help">
          {INTEREST_OPTIONS.map((interest) => {
            const active = selected.includes(interest);
            return (
              <button
                key={interest}
                type="button"
                className={`chip${active ? " is-selected" : ""}`}
                aria-pressed={active}
                onClick={() => toggleInterest(interest)}
              >
                {interest}
              </button>
            );
          })}
        </div>
        <p className="password-requirement mt-4" id="interests-help">
          You can update these later from your profile settings.
        </p>
      </section>

      {error ? (
        <p className="field-error mt-4" role="alert">
          {error}
        </p>
      ) : null}

      <button type="button" className="btn btn--primary mt-8" onClick={() => void submitInterests(false)} disabled={isSubmitting}>
        <span className="btn__label">{isSubmitting ? "Saving…" : "Continue"}</span>
      </button>
      <div className="password-skip-row mt-4">
        <button
          type="button"
          className="link-btn password-skip-row__action"
          onClick={() => void submitInterests(true)}
          disabled={isSubmitting}
        >
          Skip for now — choose interests later
        </button>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useDialogA11y } from "@/lib/accessibility/useDialogA11y";

const PROTOTYPE_CONSENT_KEY = "inrcliq_prototype_consent";

export function PrototypeConsentModal() {
  const [open, setOpen] = useState(false);
  const [consented, setConsented] = useState(false);
  const { dialogRef } = useDialogA11y(open, () => {});

  useEffect(() => {
    try {
      const consented = sessionStorage.getItem(PROTOTYPE_CONSENT_KEY);
      if (!consented) {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  function persistConsentAndClose() {
    try {
      sessionStorage.setItem(PROTOTYPE_CONSENT_KEY, "1");
    } catch {
      // Ignore storage access errors in restricted browser contexts.
    }

    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="modal-backdrop is-open prototype-consent-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prototype-consent-title"
    >
      <div className="modal prototype-consent" ref={dialogRef} tabIndex={-1}>
        <h2 id="prototype-consent-title" className="prototype-consent__title">
          Data Privacy &amp; Consent
        </h2>

        <p className="prototype-consent__intro">
          We use the personal data you provide during this onboarding prototype to test and improve our
          user journey design.
        </p>

        <dl className="prototype-consent__details">
          <div className="prototype-consent__detail">
            <dt>What we collect</dt>
            <dd>Name, age, country and email address.</dd>
          </div>
          <div className="prototype-consent__detail">
            <dt>Why we collect it</dt>
            <dd>To evaluate the usability, flow, and clarity of our onboarding process.</dd>
          </div>
          <div className="prototype-consent__detail">
            <dt>How long we keep it</dt>
            <dd>
              All data collected during this test will be permanently deleted on or before October 31,
              2026.
            </dd>
          </div>
          <div className="prototype-consent__detail">
            <dt>Your rights</dt>
            <dd>
              You can withdraw your consent or request data deletion at any time by emailing us at{" "}
              <a href="mailto:hello@inrcliq.com">hello@inrcliq.com</a>.
            </dd>
          </div>
        </dl>

        <label className="prototype-consent__checkbox">
          <input
            type="checkbox"
            id="prototype-consent-checkbox"
            checked={consented}
            onChange={(event) => setConsented(event.target.checked)}
          />
          <span>
            I agree to the collection and processing of my personal data for the purpose of testing this
            onboarding prototype as described above.
          </span>
        </label>
        <button
          type="button"
          className="btn btn--primary mt-4"
          onClick={persistConsentAndClose}
          disabled={!consented}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

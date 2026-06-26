"use client";

import { useState } from "react";
import { Disclosure } from "@/components/auth/Disclosure";
import { ID_CAPTURE_DURATION_MS, ID_DOC_TYPE_LABELS, type IdDocType } from "@/lib/guardian/constants";
import { useCaptureProgress, useVerifyCamera } from "@/components/guardian/useVerifyCamera";

function IdVerifyFlowSteps({ currentSubStep }: { currentSubStep: 1 | 2 }) {
  return (
    <nav className="id-verify__flow" aria-label="Identity verification progress">
      <ol className="id-verify__flow-steps">
        <li
          className={`id-verify__flow-step${currentSubStep === 1 ? " is-active" : " is-complete"}`}
          aria-current={currentSubStep === 1 ? "step" : undefined}
        >
          <span className="id-verify__flow-num" aria-hidden="true">
            <span className="id-verify__flow-index">1</span>
            <svg className="id-verify__flow-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span className="id-verify__flow-label">Hold up your ID</span>
        </li>
        <li
          className={`id-verify__flow-step${currentSubStep === 2 ? " is-active" : ""}`}
          aria-current={currentSubStep === 2 ? "step" : undefined}
        >
          <span className="id-verify__flow-num" aria-hidden="true">
            <span className="id-verify__flow-index">2</span>
            <svg className="id-verify__flow-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span className="id-verify__flow-label">Face scan</span>
        </li>
      </ol>
    </nav>
  );
}

export function ParentIdCaptureStep({
  docType,
  onDocTypeChange,
  onBack,
  onCaptured,
}: {
  docType: IdDocType;
  onDocTypeChange: (docType: IdDocType) => void;
  onBack: () => void;
  onCaptured: () => void;
}) {
  const { videoRef, isLive, error, startCamera } = useVerifyCamera("environment");
  const { active, progress, start, durationMs } = useCaptureProgress(ID_CAPTURE_DURATION_MS);
  const [tipsOpen, setTipsOpen] = useState(true);

  function handleCapture() {
    if (active) return;
    if (!isLive) {
      alert("Please allow camera access before capturing your ID.");
      startCamera();
      return;
    }

    start();
    window.setTimeout(onCaptured, durationMs);
  }

  return (
    <>
      <div className="id-verify__toolbar">
        <button type="button" className="parent-signup__back link-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <IdVerifyFlowSteps currentSubStep={1} />
      </div>

      <h1 className="parent-signup__title id-verify__title">ID Verification</h1>

      <div className="id-verify__doc-type mt-6">
        <span className="field-label" id="id-verify-doc-label">
          Document type
        </span>
        <div className="id-verify__doc-options" role="radiogroup" aria-labelledby="id-verify-doc-label">
          {(Object.keys(ID_DOC_TYPE_LABELS) as IdDocType[]).map((type) => (
            <button
              key={type}
              type="button"
              className={`id-verify__doc-option${docType === type ? " is-selected" : ""}`}
              role="radio"
              aria-checked={docType === type}
              onClick={() => onDocTypeChange(type)}
            >
              {ID_DOC_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div className="id-verify__capture mt-6">
        <div className={`id-verify__frame${isLive ? " is-live" : ""}`}>
          <video
            ref={videoRef}
            className="id-verify__camera"
            playsInline
            muted
            autoPlay
            aria-label="Live camera preview for ID capture"
          />
          <div className="id-verify__viewport-wrap">
            <div className="id-verify__viewport">
              {!isLive ? (
                <div className="id-verify__frame-placeholder" aria-hidden="true">
                  <svg className="id-verify__frame-icon" viewBox="0 0 64 48" fill="none" aria-hidden="true">
                    <rect x="4" y="8" width="56" height="32" rx="4" stroke="currentColor" strokeWidth="2" />
                    <circle cx="22" cy="24" r="7" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 38c2.5-5 7-7 10-7s7.5 2 10 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="36" y1="18" x2="52" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="36" y1="26" x2="48" y2="26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              ) : null}
              <div className="id-verify__frame-corners" aria-hidden="true">
                <span className="id-verify__corner id-verify__corner--tl" />
                <span className="id-verify__corner id-verify__corner--tr" />
                <span className="id-verify__corner id-verify__corner--bl" />
                <span className="id-verify__corner id-verify__corner--br" />
              </div>
            </div>
            <span className="id-verify__frame-hint">Position your ID inside the frame</span>
          </div>
          {error ? (
            <div className="id-verify__camera-error" role="alert">
              <p className="id-verify__camera-error-text">{error}</p>
              <button type="button" className="btn btn--secondary btn--sm" onClick={startCamera}>
                Allow camera access
              </button>
            </div>
          ) : null}
        </div>

        <div className="id-verify__capture-action">
          {!active ? (
            <button type="button" className="btn btn--primary id-verify__capture-btn" onClick={handleCapture}>
              Capture ID
            </button>
          ) : null}
          <div
            className={`id-verify__capture-progress${active ? " is-active" : ""}`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={active ? progress : 0}
            aria-label="Capturing ID"
            aria-hidden={!active}
          >
            <div
              className="id-verify__capture-progress-bar"
              style={{
                width: `${progress}%`,
                transition: active ? `width ${durationMs}ms linear` : "",
              }}
            />
          </div>
        </div>

        <p className="parent-verify__secure-note id-verify__secure-note">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          Data processed securely · Not stored after verification
        </p>

        <p className="parent-verify__encrypt-note id-verify__encrypt-note">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Your information is encrypted end-to-end
        </p>
      </div>

      <div className={`disclosure id-verify__tips mt-6${tipsOpen ? " is-open" : ""}`}>
        <button
          type="button"
          className="disclosure__trigger"
          aria-expanded={tipsOpen}
          onClick={() => setTipsOpen((value) => !value)}
        >
          <span className="disclosure__trigger-main">
            <svg className="disclosure__info-icon disclosure__info-icon--warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="disclosure__label">Tips for a clear capture</span>
          </span>
          <svg className="disclosure__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <div className="disclosure__panel">
          <div className="disclosure__panel-inner">
            <div className="disclosure__content id-verify__tips-content">
              <ul className="id-verify__tips-list">
                <li>All four corners of your ID must be visible</li>
                <li>Hold it flat and steady, avoid tilting</li>
                <li>Make sure text is sharp and readable</li>
                <li>Avoid glare or shadows across the document</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function ParentFaceScanStep({
  onBack,
  onCaptured,
}: {
  onBack: () => void;
  onCaptured: () => void;
}) {
  const { videoRef, isLive, error, startCamera } = useVerifyCamera("user");
  const { active, progress, start, durationMs } = useCaptureProgress(ID_CAPTURE_DURATION_MS);

  function handleCapture() {
    if (active) return;
    if (!isLive) {
      alert("Please allow camera access before starting your face scan.");
      startCamera();
      return;
    }

    start();
    window.setTimeout(onCaptured, durationMs);
  }

  return (
    <>
      <div className="id-verify__toolbar">
        <button type="button" className="parent-signup__back link-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <IdVerifyFlowSteps currentSubStep={2} />
      </div>

      <h1 className="parent-signup__title id-verify__title">Now take a quick selfie</h1>
      <p className="subtitle mt-2">
        Lower your ID. Position your face in the oval and hold still, we will match it to your ID.
      </p>

      <div className="id-verify__capture mt-8">
        <div className={`id-verify__frame id-verify__frame--face${isLive ? " is-live" : ""}`}>
          <video
            ref={videoRef}
            className="id-verify__camera"
            playsInline
            muted
            autoPlay
            aria-label="Live camera preview for face scan"
          />
          <div className="id-verify__viewport-wrap id-verify__viewport-wrap--face">
            <div className="id-verify__viewport id-verify__viewport--face">
              {!isLive ? (
                <div className="id-verify__frame-placeholder" aria-hidden="true">
                  <svg className="id-verify__face-icon" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                    <rect x="12" y="12" width="40" height="40" rx="8" stroke="currentColor" strokeWidth="2" />
                    <circle cx="32" cy="28" r="8" stroke="currentColor" strokeWidth="2" />
                    <path d="M20 46c3-6 8-9 12-9s9 3 12 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              ) : null}
              <span className="id-verify__face-oval-ring" aria-hidden="true" />
            </div>
            <span className="id-verify__frame-hint id-verify__face-hint">
              Move your camera so that your face is within the Oval frame
            </span>
          </div>
          {error ? (
            <div className="id-verify__camera-error" role="alert">
              <p className="id-verify__camera-error-text">{error}</p>
              <button type="button" className="btn btn--secondary btn--sm" onClick={startCamera}>
                Allow camera access
              </button>
            </div>
          ) : null}
        </div>

        <div className="id-verify__capture-action">
          {!active ? (
            <button type="button" className="btn btn--primary id-verify__capture-btn" onClick={handleCapture}>
              Capture selfie
            </button>
          ) : null}
          <div
            className={`id-verify__capture-progress${active ? " is-active" : ""}`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={active ? progress : 0}
            aria-label="Capturing selfie"
            aria-hidden={!active}
          >
            <div
              className="id-verify__capture-progress-bar"
              style={{
                width: `${progress}%`,
                transition: active ? `width ${durationMs}ms linear` : "",
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

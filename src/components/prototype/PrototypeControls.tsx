"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { resetPrototype } from "@/lib/prototype/reset-prototype";
import { useDialogA11y } from "@/lib/accessibility/useDialogA11y";

const ControlsIcon = () => (
  <svg
    className="prototype-controls__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

export function PrototypeControls() {
  const rootRef = useRef<HTMLDivElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [settingsPromptOpen, setSettingsPromptOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const { dialogRef } = useDialogA11y(settingsPromptOpen, () => {
    setSettingsPromptOpen(false);
    setPassword("");
    setPasswordError("");
  });

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!settingsPromptOpen) return;
    window.setTimeout(() => passwordInputRef.current?.focus(), 0);
  }, [settingsPromptOpen]);

  async function handleResetPrototype() {
    const confirmed = window.confirm(
      "Reset the prototype? This clears your session cookie and saved signup state in this browser, then returns you to the landing page. User accounts in the database are not deleted.",
    );
    if (!confirmed) return;

    setResetting(true);
    setOpen(false);

    const result = await resetPrototype();
    if (!result.ok) {
      window.alert(result.error);
      setResetting(false);
    }
  }

  function openSettingsPrompt() {
    setOpen(false);
    setPassword("");
    setPasswordError("");
    setSettingsPromptOpen(true);
  }

  async function handleSettingsUnlock(event: FormEvent) {
    event.preventDefault();
    if (unlocking) return;

    setUnlocking(true);
    setPasswordError("");

    try {
      const response = await fetch("/api/settings/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setPasswordError(data.error ?? "Incorrect password.");
        setUnlocking(false);
        passwordInputRef.current?.focus();
        return;
      }

      setSettingsPromptOpen(false);
      setPassword("");
      window.open("/settings", "_blank", "noopener,noreferrer");
    } catch {
      setPasswordError("Unable to unlock settings.");
      setUnlocking(false);
    }
  }

  return (
    <div className="prototype-controls" ref={rootRef}>
      <button
        type="button"
        className="prototype-controls__trigger"
        id="btn-prototype-controls"
        aria-label="Controls"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ControlsIcon />
      </button>

      {open ? (
        <div className="prototype-controls__menu" role="menu" aria-label="Prototype controls">
          <button
            type="button"
            className="prototype-controls__item"
            role="menuitem"
            disabled={resetting}
            onClick={() => void handleResetPrototype()}
          >
            {resetting ? "Resetting…" : "Reset Prototype"}
          </button>
          <button
            type="button"
            className="prototype-controls__item"
            role="menuitem"
            onClick={openSettingsPrompt}
          >
            Settings
          </button>
        </div>
      ) : null}

      {settingsPromptOpen ? (
        <div
          className="modal-backdrop is-open prototype-settings-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="prototype-settings-title"
        >
          <div className="modal prototype-settings-modal" ref={dialogRef} tabIndex={-1}>
            <h2 id="prototype-settings-title" className="prototype-settings-modal__title">
              Settings password
            </h2>
            <p className="prototype-settings-modal__subtitle">
              Enter the admin password to open settings.
            </p>
            <form className="gap-3 mt-6" onSubmit={handleSettingsUnlock}>
              <div className="field">
                <label className="field-label" htmlFor="prototype-settings-password">
                  Password
                </label>
                <input
                  ref={passwordInputRef}
                  className={`input${passwordError ? " input--error" : ""}`}
                  type="password"
                  id="prototype-settings-password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby="prototype-settings-password-error"
                />
                {passwordError ? (
                  <p className="field-error" id="prototype-settings-password-error" role="alert">
                    {passwordError}
                  </p>
                ) : null}
              </div>
              <div className="prototype-settings-modal__actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => {
                    setSettingsPromptOpen(false);
                    setPassword("");
                    setPasswordError("");
                  }}
                  disabled={unlocking}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={unlocking || !password.trim()}
                >
                  {unlocking ? "Checking…" : "Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { COUNTRIES } from "@/lib/constants/locations";

type GuardianChoice = {
  id: string;
  email: string;
  name: string;
  complete: boolean;
  identityStatus: string | null;
};

type LinkedPerson = { id: string; email: string; name: string };

export type AdminActionUser = {
  id: string;
  email: string;
  accountType: "ADULT" | "MINOR" | "GUARDIAN";
  emailVerified: boolean;
  hasPassword: boolean;
  onboardingStep: string | null;
  guardianEmail: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  country: string;
  region: string;
  ageGate: "to-adult" | "to-minor" | null;
  suspended: boolean;
  guardians: LinkedPerson[];
  postCount: number;
  childrenCount: number;
};

const MINOR_STEPS = ["parent", "waiting", "approved", "password", "handle", "interests", "complete"];
const ADULT_STEPS = ["password", "handle", "interests", "complete"];

export function AdminUserActions({
  user,
  guardianChoices,
}: {
  user: AdminActionUser;
  guardianChoices: GuardianChoice[];
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [childEmail, setChildEmail] = useState(user.email);
  const [guardianEmail, setGuardianEmail] = useState(user.guardianEmail);
  const [step, setStep] = useState(user.onboardingStep ?? (user.accountType === "MINOR" ? "parent" : "password"));
  const [guardianUserId, setGuardianUserId] = useState(guardianChoices[0]?.id ?? "");
  const [protectionLevel, setProtectionLevel] = useState("standard");
  const [identityWaiver, setIdentityWaiver] = useState(false);
  const [decision, setDecision] = useState(user.accountType === "GUARDIAN" ? "accepted" : "accepted");
  const [unlinkId, setUnlinkId] = useState(user.guardians[0]?.id ?? "");
  const [identity, setIdentity] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    dateOfBirth: user.dateOfBirth,
    country: user.country,
    region: user.region,
  });

  const steps = user.accountType === "MINOR" ? MINOR_STEPS : user.accountType === "ADULT" ? ADULT_STEPS : [];

  async function run(payload: Record<string, unknown>, confirmText?: string) {
    if (reason.trim().length < 3) {
      setError("Enter a reason of at least 3 characters.");
      setMessage(null);
      return;
    }
    if (confirmText && !window.confirm(confirmText)) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin-portal/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, reason, userId: user.id }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to complete that action.");
        setPending(false);
        return;
      }
      if (payload.action === "delete-user") {
        router.push("/admin/users");
        router.refresh();
        return;
      }
      setMessage(data.message ?? "Saved.");
      setPending(false);
      router.refresh();
    } catch {
      setError("Unable to reach the admin portal.");
      setPending(false);
    }
  }

  return (
    <aside className="admin-side">
      <section className="admin-section">
        <h2>Operator note</h2>
        <label className="admin-field">
          Reason
          <textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why this change is being made" />
        </label>
        {message ? <p className="admin-banner admin-banner--ok">{message}</p> : null}
        {error ? (
          <p className="admin-banner admin-banner--err" role="alert">
            {error}
          </p>
        ) : null}
        <p className="admin-meta">Every change is written to the audit log. Tokens are never shown here.</p>
      </section>

      <section className="admin-section">
        <h2>Mail and invites</h2>
        <div className="admin-actions">
          <button className="admin-btn admin-btn--subtle" type="button" disabled={pending || user.emailVerified} onClick={() => void run({ action: "resend-verification" })}>
            Resend verification
          </button>
          <button className="admin-btn admin-btn--subtle" type="button" disabled={pending || user.emailVerified} onClick={() => void run({ action: "mark-verified" })}>
            Mark email verified
          </button>
          {user.accountType === "MINOR" ? (
            <>
              <button className="admin-btn admin-btn--subtle" type="button" disabled={pending} onClick={() => void run({ action: "resend-invite" })}>
                Resend guardian invite
              </button>
              <button className="admin-btn admin-btn--subtle" type="button" disabled={pending} onClick={() => void run({ action: "resend-continue" })}>
                Resend continue link
              </button>
              <button className="admin-btn admin-btn--subtle" type="button" disabled={pending} onClick={() => void run({ action: "expire-invite" }, "Expire the open guardian invite?")}>
                Expire invite
              </button>
            </>
          ) : null}
        </div>
        <label className="admin-field">
          Correct account email
          <input value={childEmail} onChange={(event) => setChildEmail(event.target.value)} />
        </label>
        <button className="admin-btn admin-btn--subtle" type="button" disabled={pending} onClick={() => void run({ action: "correct-email", email: childEmail })}>
          Save email
        </button>
        {user.accountType === "MINOR" ? (
          <>
            <label className="admin-field" style={{ marginTop: 10 }}>
              Guardian email
              <input value={guardianEmail} onChange={(event) => setGuardianEmail(event.target.value)} />
            </label>
            <button className="admin-btn admin-btn--subtle" type="button" disabled={pending} onClick={() => void run({ action: "change-guardian-email", email: guardianEmail })}>
              Send invite to this guardian
            </button>
          </>
        ) : null}
      </section>

      {user.accountType === "MINOR" ? (
        <section className="admin-section">
          <h2>Guardian decision</h2>
          <label className="admin-field">
            Guardian account
            <select value={guardianUserId} onChange={(event) => setGuardianUserId(event.target.value)}>
              <option value="">Select</option>
              {guardianChoices.map((guardian) => (
                <option key={guardian.id} value={guardian.id}>
                  {guardian.name} · {guardian.email}
                  {guardian.complete ? "" : " · setup unfinished"}
                  {guardian.identityStatus === "rejected" ? " · identity rejected" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            Protection level
            <select value={protectionLevel} onChange={(event) => setProtectionLevel(event.target.value)}>
              <option value="strict">Strict</option>
              <option value="standard">Standard</option>
              <option value="relaxed">Relaxed</option>
            </select>
          </label>
          <label className="admin-check">
            <input type="checkbox" checked={identityWaiver} onChange={(event) => setIdentityWaiver(event.target.checked)} />
            <span>Identity waiver. Use only when this guardian has not finished simulated ID and selfie.</span>
          </label>
          <div className="admin-actions">
            <button
              className="admin-btn"
              type="button"
              disabled={pending}
              onClick={() =>
                void run(
                  { action: "force-approve", guardianUserId, protectionLevel, identityWaiver },
                  "Approve this child and email them a continue link?",
                )
              }
            >
              Approve for guardian
            </button>
            <button className="admin-btn admin-btn--subtle" type="button" disabled={pending} onClick={() => void run({ action: "link-guardian", guardianUserId, protectionLevel })}>
              Link existing guardian
            </button>
            <button className="admin-btn admin-btn--danger" type="button" disabled={pending} onClick={() => void run({ action: "force-decline" }, "Decline this invite and email the child?")}>
              Decline invite
            </button>
          </div>
          {user.guardians.length ? (
            <>
              <label className="admin-field">
                Remove link
                <select value={unlinkId} onChange={(event) => setUnlinkId(event.target.value)}>
                  {user.guardians.map((guardian) => (
                    <option key={guardian.id} value={guardian.id}>
                      {guardian.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="admin-btn admin-btn--subtle"
                type="button"
                disabled={pending}
                onClick={() => void run({ action: "unlink-guardian", guardianUserId: unlinkId }, "Remove this guardian link and return the child to the guardian-email step?")}
              >
                Remove guardian link
              </button>
              <button className="admin-btn admin-btn--subtle" type="button" disabled={pending} onClick={() => void run({ action: "change-protection", protectionLevel })} style={{ marginLeft: 6 }}>
                Update protection
              </button>
            </>
          ) : null}
          <p className="admin-meta">Protection level is stored on the family link. It does not yet change the feed.</p>
        </section>
      ) : null}

      {user.accountType === "GUARDIAN" ? (
        <section className="admin-section">
          <h2>Identity review</h2>
          <p className="admin-meta">ID and selfie capture in the product is simulated. This decision still blocks or allows later approvals.</p>
          <label className="admin-field">
            Decision
            <select value={decision} onChange={(event) => setDecision(event.target.value)}>
              <option value="accepted">Accept</option>
              <option value="rejected">Reject</option>
            </select>
          </label>
          <button className="admin-btn" type="button" disabled={pending} onClick={() => void run({ action: "review-identity", decision })}>
            Save identity decision
          </button>
        </section>
      ) : null}

      {steps.length ? (
        <section className="admin-section">
          <h2>Repair step</h2>
          <label className="admin-field">
            Onboarding step
            <select value={step} onChange={(event) => setStep(event.target.value)}>
              {steps.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <button className="admin-btn admin-btn--subtle" type="button" disabled={pending} onClick={() => void run({ action: "repair-step", step })}>
            Move to this step
          </button>
          <p className="admin-meta">A minor cannot pass approval without an active guardian link.</p>
        </section>
      ) : null}

      <section className="admin-section">
        <h2>Identity</h2>
        <label className="admin-field">
          First name
          <input value={identity.firstName} onChange={(event) => setIdentity({ ...identity, firstName: event.target.value })} />
        </label>
        <label className="admin-field">
          Last name
          <input value={identity.lastName} onChange={(event) => setIdentity({ ...identity, lastName: event.target.value })} />
        </label>
        <label className="admin-field">
          Date of birth
          <input type="date" value={identity.dateOfBirth} onChange={(event) => setIdentity({ ...identity, dateOfBirth: event.target.value })} />
        </label>
        <label className="admin-field">
          Country
          <select value={identity.country} onChange={(event) => setIdentity({ ...identity, country: event.target.value })}>
            <option value="">Not set</option>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.label}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          Region
          <input value={identity.region} onChange={(event) => setIdentity({ ...identity, region: event.target.value })} />
        </label>
        <button className="admin-btn admin-btn--subtle" type="button" disabled={pending} onClick={() => void run({ action: "update-identity", ...identity })}>
          Save identity
        </button>
        {user.ageGate ? (
          <div className="admin-banner admin-banner--warn" style={{ marginTop: 10 }}>
            <p>
              {user.ageGate === "to-adult"
                ? "This date of birth is 18 or older, and the account is still a minor."
                : "This date of birth is under 18, and the account is still an adult."}
            </p>
            <button
              className="admin-btn"
              type="button"
              disabled={pending}
              onClick={() =>
                void run(
                  { action: "apply-age-gate" },
                  user.ageGate === "to-adult"
                    ? "Convert this account to adult and expire open invites?"
                    : "Convert this account to minor and return them to the guardian-email step?",
                )
              }
            >
              Apply age-gate correction
            </button>
          </div>
        ) : null}
      </section>

      <section className="admin-section">
        <h2>Account</h2>
        <div className="admin-actions">
          {user.suspended ? (
            <button className="admin-btn" type="button" disabled={pending} onClick={() => void run({ action: "restore" })}>
              Restore sign-in
            </button>
          ) : (
            <button className="admin-btn admin-btn--danger" type="button" disabled={pending} onClick={() => void run({ action: "suspend" }, "Suspend sign-in and end current sessions?")}>
              Suspend
            </button>
          )}
          <button className="admin-btn admin-btn--subtle" type="button" disabled={pending || !user.hasPassword} onClick={() => void run({ action: "clear-password" }, "Clear the password so the next sign-in uses an email code?")}>
            Clear password
          </button>
          <button
            className="admin-btn admin-btn--danger"
            type="button"
            disabled={pending}
            onClick={() =>
              void run(
                { action: "delete-user" },
                `Delete this account? ${user.childrenCount} linked children and ${user.guardians.length} guardians will be detached. ${user.postCount} feed posts will stay in the feed.`,
              )
            }
          >
            Delete account
          </button>
        </div>
      </section>
    </aside>
  );
}

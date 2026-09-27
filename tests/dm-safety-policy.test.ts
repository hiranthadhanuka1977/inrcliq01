import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateDmSafetyPolicy,
  resolvePolicyAgeZone,
  type DmSafetyPolicyInput,
} from "@/lib/guardian/dm-safety-policy";

function input(overrides: Partial<DmSafetyPolicyInput> = {}): DmSafetyPolicyInput {
  return {
    flagged: true,
    verificationFailed: false,
    category: "Sexual",
    severity: 4,
    senderZone: "ADULT",
    senderAgeYears: 30,
    senderMonitored: false,
    recipientZone: "KIDS",
    recipientAgeYears: 10,
    recipientMonitored: true,
    senderRestrictedFromMinors: false,
    ...overrides,
  };
}

describe("evaluateDmSafetyPolicy", () => {
  it("R1: restricted sender messaging a minor is blocked outright", () => {
    const decision = evaluateDmSafetyPolicy(input({ senderRestrictedFromMinors: true, flagged: false }));
    assert.equal(decision.outcome, "restricted");
    assert.equal(decision.onSendAnyway, "not_allowed");
    assert.equal(decision.recordStrike, false);
  });

  it("R1 does not apply to adult recipients", () => {
    const decision = evaluateDmSafetyPolicy(
      input({ senderRestrictedFromMinors: true, flagged: false, recipientZone: "ADULT", recipientAgeYears: 40 }),
    );
    assert.equal(decision.outcome, "deliver");
  });

  it("R2: clean message is delivered", () => {
    const decision = evaluateDmSafetyPolicy(input({ flagged: false, category: "Neutral", severity: 0 }));
    assert.equal(decision.outcome, "deliver");
    assert.equal(decision.onSendAnyway, null);
  });

  it("R3: verification failure to a minor cannot be overridden", () => {
    const decision = evaluateDmSafetyPolicy(input({ flagged: false, verificationFailed: true }));
    assert.equal(decision.outcome, "warn_no_override");
    assert.equal(decision.onSendAnyway, "not_allowed");
  });

  it("guardian → own child with a co-guardian: held for the co-guardian, no strike", () => {
    const decision = evaluateDmSafetyPolicy(input({ senderIsRecipientGuardian: true }));
    assert.equal(decision.onSendAnyway, "hold_withheld");
    assert.equal(decision.recordStrike, false);
    assert.equal(decision.alertPriority, "high");
  });

  it("guardian → own child as sole guardian: can't override, severity 6 still auto-reports", () => {
    const moderate = evaluateDmSafetyPolicy(
      input({ senderIsRecipientGuardian: true, recipientMonitored: false }),
    );
    assert.equal(moderate.outcome, "warn_no_override");
    assert.equal(moderate.recordStrike, false);
    assert.equal(moderate.autoReport, false);
    const severe = evaluateDmSafetyPolicy(
      input({ senderIsRecipientGuardian: true, recipientMonitored: false, severity: 6 }),
    );
    assert.equal(severe.autoReport, true);
  });

  it("R4: adult recipient keeps masked delivery", () => {
    const decision = evaluateDmSafetyPolicy(input({ recipientZone: "ADULT", recipientAgeYears: 25 }));
    assert.equal(decision.outcome, "warn");
    assert.equal(decision.onSendAnyway, "masked_delivery");
    assert.equal(decision.recordStrike, false);
  });

  it("R4: monitored minor sender to adult notifies sender guardians", () => {
    const decision = evaluateDmSafetyPolicy(
      input({
        senderZone: "TEENS",
        senderAgeYears: 14,
        senderMonitored: true,
        recipientZone: "ADULT",
        recipientAgeYears: 25,
      }),
    );
    assert.equal(decision.notifySenderGuardians, true);
  });

  it("R5: non-sexual flag to a minor is masked delivery with medium alert", () => {
    const decision = evaluateDmSafetyPolicy(input({ category: "Hate" }));
    assert.equal(decision.outcome, "warn");
    assert.equal(decision.onSendAnyway, "masked_delivery");
    assert.equal(decision.alertPriority, "medium");
    assert.equal(decision.recordStrike, false);
  });

  it("R6: sexual to unmonitored minor cannot be sent", () => {
    const decision = evaluateDmSafetyPolicy(input({ recipientMonitored: false, severity: 4 }));
    assert.equal(decision.outcome, "warn_no_override");
    assert.equal(decision.onSendAnyway, "not_allowed");
    assert.equal(decision.recordStrike, false);
    assert.equal(decision.autoReport, false);
  });

  it("R6: adult severity 6 to unmonitored minor auto-reports", () => {
    const decision = evaluateDmSafetyPolicy(input({ recipientMonitored: false, severity: 6 }));
    assert.equal(decision.autoReport, true);
  });

  it("R7: sexual to monitored Kids is held and withheld", () => {
    const decision = evaluateDmSafetyPolicy(input());
    assert.equal(decision.outcome, "warn");
    assert.equal(decision.onSendAnyway, "hold_withheld");
    assert.equal(decision.recordStrike, true);
  });

  it("R7: sexual to monitored Teens is held and withheld", () => {
    const decision = evaluateDmSafetyPolicy(input({ recipientZone: "TEENS", recipientAgeYears: 14 }));
    assert.equal(decision.onSendAnyway, "hold_withheld");
  });

  it("R8: sexual to monitored Mature Teens is held with masked placeholder", () => {
    const decision = evaluateDmSafetyPolicy(input({ recipientZone: "MATURE_TEENS", recipientAgeYears: 17 }));
    assert.equal(decision.outcome, "warn");
    assert.equal(decision.onSendAnyway, "hold_masked_placeholder");
  });

  it("minor senders never record strikes but notify their guardians", () => {
    const decision = evaluateDmSafetyPolicy(
      input({ senderZone: "TEENS", senderAgeYears: 14, senderMonitored: true, recipientZone: "TEENS", recipientAgeYears: 14 }),
    );
    assert.equal(decision.recordStrike, false);
    assert.equal(decision.notifySenderGuardians, true);
  });

  describe("priority", () => {
    it("adult → Teens severity 2 is high", () => {
      const decision = evaluateDmSafetyPolicy(input({ recipientZone: "TEENS", recipientAgeYears: 14, severity: 2 }));
      assert.equal(decision.alertPriority, "high");
    });

    it("Teens → Teens severity 2 is medium", () => {
      const decision = evaluateDmSafetyPolicy(
        input({ senderZone: "TEENS", senderAgeYears: 14, recipientZone: "TEENS", recipientAgeYears: 14, severity: 2 }),
      );
      assert.equal(decision.alertPriority, "medium");
    });

    it("Mature Teens → Kids severity 2 is high (cross-zone)", () => {
      const decision = evaluateDmSafetyPolicy(
        input({ senderZone: "MATURE_TEENS", senderAgeYears: 16, recipientZone: "KIDS", recipientAgeYears: 12, severity: 2 }),
      );
      assert.equal(decision.alertPriority, "high");
    });

    it("Kids → Kids with a 3-year gap is high", () => {
      const decision = evaluateDmSafetyPolicy(
        input({ senderZone: "KIDS", senderAgeYears: 12, recipientZone: "KIDS", recipientAgeYears: 9, severity: 2 }),
      );
      assert.equal(decision.alertPriority, "high");
    });

    it("Kids → Kids close in age at severity 2 is medium", () => {
      const decision = evaluateDmSafetyPolicy(
        input({ senderZone: "KIDS", senderAgeYears: 11, recipientZone: "KIDS", recipientAgeYears: 10, severity: 2 }),
      );
      assert.equal(decision.alertPriority, "medium");
    });

    it("peer severity 4 is high", () => {
      const decision = evaluateDmSafetyPolicy(
        input({ senderZone: "TEENS", senderAgeYears: 14, recipientZone: "TEENS", recipientAgeYears: 14, severity: 4 }),
      );
      assert.equal(decision.alertPriority, "high");
    });
  });

  describe("autoReport", () => {
    it("adult → Kids severity 6 is true", () => {
      assert.equal(evaluateDmSafetyPolicy(input({ severity: 6 })).autoReport, true);
    });

    it("adult → Mature Teens severity 6 is false", () => {
      const decision = evaluateDmSafetyPolicy(
        input({ severity: 6, recipientZone: "MATURE_TEENS", recipientAgeYears: 17 }),
      );
      assert.equal(decision.autoReport, false);
    });

    it("adult → Kids severity 4 is false", () => {
      assert.equal(evaluateDmSafetyPolicy(input({ severity: 4 })).autoReport, false);
    });
  });
});

describe("resolvePolicyAgeZone", () => {
  it("minor with missing DOB is treated as KIDS", () => {
    assert.deepEqual(resolvePolicyAgeZone({ dateOfBirth: null, accountType: "MINOR" }), {
      zone: "KIDS",
      ageYears: null,
    });
  });

  it("adult or guardian with missing DOB is ADULT", () => {
    assert.equal(resolvePolicyAgeZone({ dateOfBirth: null, accountType: "ADULT" }).zone, "ADULT");
    assert.equal(resolvePolicyAgeZone({ dateOfBirth: null, accountType: "GUARDIAN" }).zone, "ADULT");
  });

  it("DOB wins over account type", () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 14);
    dob.setDate(dob.getDate() - 1);
    assert.deepEqual(resolvePolicyAgeZone({ dateOfBirth: dob, accountType: "ADULT" }), {
      zone: "TEENS",
      ageYears: 14,
    });
  });
});

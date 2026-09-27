/**
 * Integration tests for DM guardian review against the local database.
 * Run: npx tsx --env-file=.env --env-file=.env.local --test tests/dm-guardian-review.integration.test.ts
 * Creates throwaway users (email *@dm-review.test) and deletes them afterwards.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "@/lib/prisma";
import { mapThreadToConversation } from "@/lib/feed/chat";
import { getChatThreadForUser, sendChatMessage } from "@/lib/feed/chat-service";
import { getDirectMessagingRestriction } from "@/lib/guardian/dm-contact-controls";
import {
  createDmModerationHold,
  decideDmHold,
  expireOverdueHolds,
  loadDmSafetyParticipants,
} from "@/lib/guardian/dm-moderation-hold";
import { evaluateDmSafetyPolicy } from "@/lib/guardian/dm-safety-policy";
import { MASKED_PENDING_BODY, REMOVED_BODY } from "@/lib/guardian/is-user-minor";
import {
  applySafetyAlertAction,
  countUnresolvedSafetyAlerts,
  listSafetyActivityItemsForGuardian,
  listSafetyAlertCardsForGuardian,
  reportFromSafetyAlert,
  viewHeldMessageForGuardian,
} from "@/lib/guardian/safety-alerts";
import { getSenderMinorDmRestriction } from "@/lib/guardian/sender-enforcement";
import type { AgeZoneCode } from "@/lib/utils/age-zone";

const RUN = Math.random().toString(36).slice(2, 8);
const RAW_BODY = "send me nudes, text me on +94 77 123 4567";

function yearsAgo(years: number) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  date.setDate(date.getDate() - 2);
  return date;
}

const ids: Record<string, string> = {};

async function createUser(key: string, accountType: "ADULT" | "MINOR" | "GUARDIAN", age: number) {
  const user = await prisma.user.create({
    data: {
      email: `${key}-${RUN}@dm-review.test`,
      firstName: key[0]!.toUpperCase() + key.slice(1),
      lastName: "Test",
      handle: `dmrev_${key}_${RUN}`,
      accountType,
      dateOfBirth: yearsAgo(age),
    },
    select: { id: true },
  });
  ids[key] = user.id;
  return user.id;
}

async function senderThreadTo(senderKey: string, recipientKey: string) {
  const thread = await prisma.chatThread.create({
    data: {
      userId: ids[senderKey]!,
      peerName: `${recipientKey} Test`,
      peerHandle: `@dmrev_${recipientKey}_${RUN}`,
      peerInitials: "RT",
      peerAvatarColor: "#6b9fff",
    },
  });
  return thread;
}

async function holdFor(
  senderKey: string,
  recipientKey: string,
  recipientZone: AgeZoneCode,
  severity: 2 | 4 | 6 = 4,
) {
  const thread = await senderThreadTo(senderKey, recipientKey);
  const decision = evaluateDmSafetyPolicy({
    flagged: true,
    verificationFailed: false,
    category: "Sexual",
    severity,
    senderZone: "ADULT",
    senderAgeYears: 30,
    senderMonitored: false,
    recipientZone,
    recipientAgeYears: recipientZone === "KIDS" ? 10 : 17,
    recipientMonitored: true,
    senderRestrictedFromMinors: false,
  });
  const result = await createDmModerationHold({
    senderUserId: ids[senderKey]!,
    recipientUserId: ids[recipientKey]!,
    senderThread: thread,
    body: RAW_BODY,
    category: "Sexual",
    severity,
    senderZone: "ADULT",
    recipientZone,
    treatment: decision.onSendAnyway === "hold_masked_placeholder" ? "MASKED_PLACEHOLDER" : "WITHHELD",
    decision,
  });
  return { ...result, thread };
}

async function alertIdFor(guardianKey: string, holdId: string) {
  const alert = await prisma.guardianSafetyAlert.findFirstOrThrow({
    where: { guardianUserId: ids[guardianKey]!, holdId },
    select: { id: true },
  });
  return alert.id;
}

before(async () => {
  await createUser("adult", "ADULT", 30);
  await createUser("repeat", "ADULT", 35);
  await createUser("e2e", "ADULT", 28);
  await createUser("kid", "MINOR", 10);
  await createUser("teen", "MINOR", 17);
  await createUser("guardiana", "GUARDIAN", 40);
  await createUser("guardianb", "GUARDIAN", 42);
  await createUser("stranger", "GUARDIAN", 45);
  await createUser("orphan", "MINOR", 9);
  await createUser("youngteen", "MINOR", 14);
  await createUser("guardianc", "GUARDIAN", 44);
  await createUser("masker", "ADULT", 33);
  await createUser("flood", "ADULT", 31);
  await prisma.guardianChildLink.createMany({
    data: [
      { guardianUserId: ids.guardiana!, childUserId: ids.kid! },
      { guardianUserId: ids.guardianb!, childUserId: ids.kid! },
      { guardianUserId: ids.guardiana!, childUserId: ids.teen! },
      { guardianUserId: ids.guardianc!, childUserId: ids.youngteen! },
    ],
  });
});

after(async () => {
  const userIds = Object.values(ids);
  await prisma.safetyAuditEvent.deleteMany({
    where: {
      OR: [
        { childUserId: { in: userIds } },
        { subjectUserId: { in: userIds } },
        { actorUserId: { in: userIds } },
      ],
    },
  });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe("DM guardian review (integration)", () => {
  it("adult → Kids hold: withheld, one decision alert per guardian, strike + warning", async () => {
    const { holdId, senderMessageId, enforcement } = await holdFor("adult", "kid", "KIDS");

    const hold = await prisma.dmModerationHold.findUniqueOrThrow({ where: { id: holdId } });
    assert.equal(hold.status, "PENDING");
    assert.equal(hold.recipientTreatment, "WITHHELD");
    assert.equal(hold.recipientThreadId, null);

    const senderMessage = await prisma.chatMessage.findUniqueOrThrow({ where: { id: senderMessageId } });
    assert.equal(senderMessage.deliveryStatus, "PENDING_REVIEW");

    const kidThreads = await prisma.chatThread.count({ where: { userId: ids.kid! } });
    assert.equal(kidThreads, 0, "Kids recipient must not get a thread or message while held");

    const alerts = await prisma.guardianSafetyAlert.findMany({ where: { holdId } });
    assert.equal(alerts.length, 2);
    assert.ok(alerts.every((alert) => alert.status === "AWAITING_DECISION" && alert.counterpartIsAdult));
    assert.ok(alerts.every((alert) => !alert.actionTaken.includes("nudes")));

    assert.deepEqual(enforcement, { level: "warning" });
    assert.equal(await prisma.senderSafetyStrike.count({ where: { holdId } }), 1);

    assert.ok((await countUnresolvedSafetyAlerts(ids.guardiana!)) >= 1);
    const cards = await listSafetyAlertCardsForGuardian(ids.guardiana!);
    assert.equal(cards[0]?.statusCode, "AWAITING_DECISION", "pending decisions are pinned first");
    assert.equal(cards[0]?.counterpart?.isAdult, true);

    // Allow (guardian A) → delivered, strike voided, trust band assigned, all alerts ALLOWED.
    const alertId = await alertIdFor("guardiana", holdId);
    const allow = await applySafetyAlertAction(ids.guardiana!, alertId, "allow");
    assert.equal(allow.ok, true);

    const allowed = await prisma.dmModerationHold.findUniqueOrThrow({ where: { id: holdId } });
    assert.equal(allowed.status, "ALLOWED");
    assert.ok(allowed.recipientThreadId);
    const delivered = await prisma.chatMessage.findUniqueOrThrow({ where: { id: allowed.recipientMessageId! } });
    assert.equal(delivered.body, RAW_BODY);
    assert.equal(delivered.contentMasked, false);
    assert.equal(
      (await prisma.chatMessage.findUniqueOrThrow({ where: { id: senderMessageId } })).deliveryStatus,
      "DELIVERED",
    );
    const strike = await prisma.senderSafetyStrike.findFirstOrThrow({ where: { holdId } });
    assert.equal(strike.voidReason, "guardian_allowed");
    const band = await prisma.childContactTrustBand.findUniqueOrThrow({
      where: { childUserId_contactKey: { childUserId: ids.kid!, contactKey: allowed.recipientThreadId! } },
    });
    assert.equal(band.trustBand, "approved_wider");
    const statuses = await prisma.guardianSafetyAlert.findMany({ where: { holdId }, select: { status: true } });
    assert.ok(statuses.every((row) => row.status === "ALLOWED"));

    // Guardian B deciding afterwards → 409 HOLD_ALREADY_DECIDED.
    const late = await applySafetyAlertAction(ids.guardianb!, await alertIdFor("guardianb", holdId), "reject");
    assert.equal(late.ok, false);
    assert.equal(!late.ok && late.status, 409);
    assert.equal(!late.ok && late.code, "HOLD_ALREADY_DECIDED");
  });

  it("adult → Mature Teens: masked placeholder never exposes body; reject removes it", async () => {
    const { holdId, senderMessageId } = await holdFor("adult", "teen", "MATURE_TEENS");
    const hold = await prisma.dmModerationHold.findUniqueOrThrow({ where: { id: holdId } });
    assert.equal(hold.recipientTreatment, "MASKED_PLACEHOLDER");
    assert.ok(hold.recipientThreadId && hold.recipientMessageId);

    const placeholder = await prisma.chatMessage.findUniqueOrThrow({ where: { id: hold.recipientMessageId! } });
    assert.equal(placeholder.contentMasked, true);
    assert.equal(placeholder.deliveryStatus, "PENDING_REVIEW");
    assert.equal(placeholder.body, MASKED_PENDING_BODY);

    const teenThread = await getChatThreadForUser(ids.teen!, hold.recipientThreadId!);
    const conversation = mapThreadToConversation(teenThread!);
    assert.ok(!JSON.stringify(conversation).includes("nudes"), "recipient API must never include raw body");
    assert.equal(conversation.messages.at(-1)?.body, MASKED_PENDING_BODY);
    assert.equal(teenThread!.unreadCount, 1);

    const reject = await decideDmHold(holdId, ids.guardiana!, "reject");
    assert.equal(reject.ok, true);
    const removed = await prisma.chatMessage.findUniqueOrThrow({ where: { id: hold.recipientMessageId! } });
    assert.equal(removed.body, REMOVED_BODY);
    assert.equal(removed.deliveryStatus, "NOT_DELIVERED");
    assert.equal(
      (await prisma.chatMessage.findUniqueOrThrow({ where: { id: senderMessageId } })).deliveryStatus,
      "NOT_DELIVERED",
    );
    const alert = await prisma.guardianSafetyAlert.findFirstOrThrow({ where: { holdId } });
    assert.equal(alert.status, "REJECTED");
  });

  it("concurrent decisions: exactly one wins, the other gets 409", async () => {
    const { holdId } = await holdFor("adult", "kid", "KIDS");
    const results = await Promise.all([
      decideDmHold(holdId, ids.guardiana!, "allow"),
      decideDmHold(holdId, ids.guardianb!, "reject"),
    ]);
    assert.equal(results.filter((result) => result.ok).length, 1);
    const loser = results.find((result) => !result.ok);
    assert.equal(loser && !loser.ok && loser.status, 409);
  });

  it("overdue hold is lazily expired when guardian lists alerts", async () => {
    const { holdId, senderMessageId } = await holdFor("adult", "kid", "KIDS");
    await prisma.dmModerationHold.update({
      where: { id: holdId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await listSafetyAlertCardsForGuardian(ids.guardiana!);
    const hold = await prisma.dmModerationHold.findUniqueOrThrow({ where: { id: holdId } });
    assert.equal(hold.status, "EXPIRED");
    const alerts = await prisma.guardianSafetyAlert.findMany({ where: { holdId }, select: { status: true } });
    assert.ok(alerts.every((row) => row.status === "EXPIRED"));
    assert.equal(
      (await prisma.chatMessage.findUniqueOrThrow({ where: { id: senderMessageId } })).deliveryStatus,
      "NOT_DELIVERED",
    );
    assert.equal(await expireOverdueHolds({ userIds: [ids.kid!] }), 0);
  });

  it("strike escalation: 2nd → 7-day restriction, 3rd → under review + repeat_offender report", async () => {
    const first = await holdFor("repeat", "kid", "KIDS");
    assert.deepEqual(first.enforcement, { level: "warning" });

    const second = await holdFor("repeat", "kid", "KIDS");
    assert.equal(second.enforcement?.level, "restricted");
    const restriction = await getSenderMinorDmRestriction(ids.repeat!);
    assert.ok(restriction?.endsAt);

    const kidThread = await senderThreadTo("repeat", "kid");
    const gate = await sendChatMessage(ids.repeat!, kidThread.id, "hi there");
    assert.ok(gate && "restricted" in gate && gate.code === "DM_MINOR_RESTRICTED");

    // Adults are unaffected by a minors-only restriction.
    const adultThread = await senderThreadTo("repeat", "adult");
    const toAdult = await sendChatMessage(ids.repeat!, adultThread.id, "hi there");
    assert.ok(toAdult && "thread" in toAdult, "sends to adults still work");

    // Simulate the 7-day ban ending, then a third strike within 30 days.
    await prisma.userDmRestriction.updateMany({
      where: { userId: ids.repeat! },
      data: { endsAt: new Date(Date.now() - 1000) },
    });
    const third = await holdFor("repeat", "kid", "KIDS");
    assert.deepEqual(third.enforcement, { level: "under_review" });
    const indefinite = await getSenderMinorDmRestriction(ids.repeat!);
    assert.equal(indefinite?.endsAt, null);
    assert.equal(indefinite?.reviewStatus, "PENDING_REVIEW");
    const report = await prisma.safetyReport.findFirst({
      where: { subjectUserId: ids.repeat!, reason: "repeat_offender" },
    });
    assert.equal(report?.priority, "urgent");
  });

  it("view: unlinked guardian 404, linked guardian gets light-masked text + audit, purged → 410", async () => {
    const { holdId } = await holdFor("adult", "kid", "KIDS");
    const alertId = await alertIdFor("guardiana", holdId);

    const stranger = await viewHeldMessageForGuardian(ids.stranger!, alertId);
    assert.equal(!stranger.ok && stranger.status, 404);

    const view = await viewHeldMessageForGuardian(ids.guardiana!, alertId);
    assert.ok(view.ok);
    assert.ok(view.ok && view.lightMaskedBody.includes("n****"));
    assert.ok(view.ok && view.lightMaskedBody.includes("[phone hidden]"));
    assert.ok(view.ok && !view.lightMaskedBody.includes("nudes"));
    assert.equal(
      await prisma.safetyAuditEvent.count({ where: { holdId, action: "CONTENT_VIEWED" } }),
      1,
    );

    await prisma.dmModerationHold.update({
      where: { id: holdId },
      data: { body: null, bodyPurgedAt: new Date() },
    });
    const purged = await viewHeldMessageForGuardian(ids.guardiana!, alertId);
    assert.equal(!purged.ok && purged.status, 410);
  });

  it("report + block from an alert, and activity log entries", async () => {
    const { holdId } = await holdFor("adult", "kid", "KIDS");
    const alertId = await alertIdFor("guardianb", holdId);

    const report = await reportFromSafetyAlert(ids.guardianb!, alertId, {
      reason: "grooming_concern",
      details: "Asked for photos",
    });
    assert.ok(report.ok && report.created);
    const stored = await prisma.safetyReport.findUniqueOrThrow({ where: { id: report.ok ? report.reportId : "" } });
    assert.equal(stored.mandatoryReportCandidate, true);
    const repeat = await reportFromSafetyAlert(ids.guardianb!, alertId, { reason: "other", details: null });
    assert.ok(repeat.ok && !repeat.created, "one report per guardian per alert");

    const kidMessagesBefore = await prisma.chatMessage.count({ where: { thread: { userId: ids.kid! } } });
    const kidUnreadBefore = await prisma.chatThread.aggregate({
      where: { userId: ids.kid! },
      _sum: { unreadCount: true },
    });
    const block = await applySafetyAlertAction(ids.guardianb!, alertId, "block");
    assert.equal(block.ok, true, JSON.stringify(block));
    const hold = await prisma.dmModerationHold.findUniqueOrThrow({ where: { id: holdId } });
    assert.ok(hold.recipientThreadId, "withheld hold gets a silent recipient thread for blocking");
    assert.equal(
      await prisma.chatMessage.count({ where: { thread: { userId: ids.kid! } } }),
      kidMessagesBefore,
      "blocking never delivers anything to the child",
    );
    const kidUnreadAfter = await prisma.chatThread.aggregate({
      where: { userId: ids.kid! },
      _sum: { unreadCount: true },
    });
    assert.equal(kidUnreadAfter._sum.unreadCount, kidUnreadBefore._sum.unreadCount);

    const adultThread = await prisma.chatThread.findUniqueOrThrow({ where: { id: hold.senderThreadId } });
    const restriction = await getDirectMessagingRestriction(ids.adult!, adultThread);
    assert.equal(restriction.restricted, true);

    const activity = await listSafetyActivityItemsForGuardian(ids.guardianb!);
    const titles = activity.map((item) => item.title);
    assert.ok(titles.includes("Safety alert raised"));
    assert.ok(titles.includes("Contact blocked"));
    assert.ok(titles.includes("Reported to INRCLIQ"));
    assert.ok(!titles.some((title) => /strike|restriction/i.test(title)));
    assert.ok(!JSON.stringify(activity).includes("nudes"));
  });

  it("end-to-end send (real moderation): warning first, then Send anyway submits for review", async () => {
    const thread = await senderThreadTo("e2e", "teen");
    const body = "you look sexy, send nudes";

    const first = await sendChatMessage(ids.e2e!, thread.id, body);
    assert.ok(first && "moderationRequired" in first, `expected warning, got ${JSON.stringify(first)}`);
    if (!first || !("moderationRequired" in first)) return;
    assert.equal(first.moderation.recipientIsMinor, true);
    assert.equal(first.moderation.title, first.moderation.verificationFailed ? "Message not sent" : "Message blocked");

    if (first.moderation.verificationFailed) {
      assert.equal(first.moderation.canSendAnyway, false);
      return;
    }
    assert.equal(first.moderation.canSendAnyway, true);
    assert.equal(first.moderation.category, "", "category is never revealed for minor recipients");
    assert.equal(first.moderation.confidence, 0);
    assert.equal(first.moderation.sendAnywayOutcome, null);
    assert.equal(await prisma.dmModerationHold.count({ where: { senderThreadId: thread.id } }), 0);

    const second = await sendChatMessage(ids.e2e!, thread.id, body, { acceptModeration: true });
    assert.ok(second && "thread" in second);
    const holds = await prisma.dmModerationHold.findMany({ where: { senderThreadId: thread.id } });
    assert.equal(holds.length, 1);
    assert.equal(holds[0]!.recipientTreatment, "MASKED_PLACEHOLDER");
    const mine = second && "thread" in second ? mapThreadToConversation(second.thread!) : null;
    assert.equal(mine?.messages.at(-1)?.deliveryStatus, "PENDING_REVIEW");
  });

  it("adult → adult (real moderation): flagged text is masked for the recipient, no hold, no strike", async () => {
    const thread = await senderThreadTo("masker", "adult");
    const body = "you look sexy, send nudes";
    const first = await sendChatMessage(ids.masker!, thread.id, body);
    assert.ok(first && "moderationRequired" in first, `expected warning, got ${JSON.stringify(first)}`);
    if (!first || !("moderationRequired" in first)) return;
    assert.equal(first.moderation.verificationFailed, false, "Azure moderation must be reachable");
    assert.equal(first.moderation.recipientIsMinor, false);
    assert.equal(first.moderation.category, "Sexual", "adults still see the category");
    assert.equal(first.moderation.canSendAnyway, true);
    assert.equal(first.moderation.sendAnywayOutcome, "masked");

    const second = await sendChatMessage(ids.masker!, thread.id, body, { acceptModeration: true });
    assert.ok(second && "thread" in second);
    assert.equal(await prisma.dmModerationHold.count({ where: { senderUserId: ids.masker! } }), 0);
    assert.equal(await prisma.senderSafetyStrike.count({ where: { userId: ids.masker! } }), 0);
    const mirrored = await prisma.chatMessage.findFirst({
      where: { thread: { userId: ids.adult! }, contentMasked: true, fromMe: false },
      orderBy: { createdAt: "desc" },
    });
    assert.ok(mirrored, "recipient gets a masked copy");
    assert.ok(!mirrored!.body.includes("nudes"), "raw text is never stored on the recipient side");
  });

  it("unmonitored child (real moderation): Send anyway not offered; system reports are de-duplicated", async () => {
    const thread = await senderThreadTo("flood", "orphan");
    const body = "you look sexy, send nudes";
    const first = await sendChatMessage(ids.flood!, thread.id, body);
    assert.ok(first && "moderationRequired" in first, `expected warning, got ${JSON.stringify(first)}`);
    if (!first || !("moderationRequired" in first)) return;
    assert.equal(first.moderation.recipientIsMinor, true);
    assert.equal(first.moderation.canSendAnyway, false);

    // A crafted client could still post acceptModeration — it must not deliver or hold.
    const forced = await sendChatMessage(ids.flood!, thread.id, body, { acceptModeration: true });
    assert.ok(forced && "moderationRequired" in forced);
    assert.equal(await prisma.dmModerationHold.count({ where: { senderUserId: ids.flood! } }), 0);
    assert.equal(await prisma.chatThread.count({ where: { userId: ids.orphan! } }), 0);

    const { createSystemSafetyReport } = await import("@/lib/guardian/safety-reports");
    const since = new Date(Date.now() - 86_400_000);
    const a = await createSystemSafetyReport({
      subjectUserId: ids.flood!,
      reason: "sexual_content_to_minor",
      childUserId: ids.orphan!,
      dedupeSince: since,
    });
    const b = await createSystemSafetyReport({
      subjectUserId: ids.flood!,
      reason: "sexual_content_to_minor",
      childUserId: ids.orphan!,
      dedupeSince: since,
    });
    assert.equal(a.id, b.id, "repeat attempts reuse the open system report");
  });

  it("acknowledge: rejected on decision alerts, allowed once on informational alerts", async () => {
    const { holdId } = await holdFor("adult", "kid", "KIDS");
    const decisionAlertId = await alertIdFor("guardiana", holdId);
    const ackDecision = await applySafetyAlertAction(ids.guardiana!, decisionAlertId, "acknowledge");
    assert.equal(!ackDecision.ok && ackDecision.code, "INVALID_ALERT_STATE");

    const stranger = await applySafetyAlertAction(ids.stranger!, decisionAlertId, "allow");
    assert.equal(!stranger.ok && stranger.status, 404, "unlinked guardian can't decide");

    // Teen (14, monitored) → Kids: recipient guardians decide, sender's guardian gets an informational alert.
    const thread = await senderThreadTo("youngteen", "kid");
    const decision = evaluateDmSafetyPolicy({
      flagged: true,
      verificationFailed: false,
      category: "Sexual",
      severity: 4,
      senderZone: "TEENS",
      senderAgeYears: 14,
      senderMonitored: true,
      recipientZone: "KIDS",
      recipientAgeYears: 10,
      recipientMonitored: true,
      senderRestrictedFromMinors: false,
    });
    assert.equal(decision.recordStrike, false, "minors never get strikes");
    const teenHold = await createDmModerationHold({
      senderUserId: ids.youngteen!,
      recipientUserId: ids.kid!,
      senderThread: thread,
      body: RAW_BODY,
      category: "Sexual",
      severity: 4,
      senderZone: "TEENS",
      recipientZone: "KIDS",
      treatment: "WITHHELD",
      decision,
    });
    assert.equal(teenHold.enforcement, null);
    const info = await prisma.guardianSafetyAlert.findFirstOrThrow({
      where: { guardianUserId: ids.guardianc!, childUserId: ids.youngteen! },
    });
    assert.equal(info.holdId, null);
    assert.equal(info.status, "AWAITING_ACKNOWLEDGEMENT");
    assert.ok(!info.actionTaken.includes("nudes"));

    const cards = await listSafetyAlertCardsForGuardian(ids.guardianc!);
    assert.equal(cards[0]?.kind, "informational");
    assert.equal(cards[0]?.canDecide, false);

    const allowInfo = await applySafetyAlertAction(ids.guardianc!, info.id, "allow");
    assert.equal(!allowInfo.ok && allowInfo.code, "INVALID_ALERT_STATE");
    const ack = await applySafetyAlertAction(ids.guardianc!, info.id, "acknowledge");
    assert.equal(ack.ok, true);
    const again = await applySafetyAlertAction(ids.guardianc!, info.id, "acknowledge");
    assert.equal(!again.ok && again.code, "INVALID_ALERT_STATE");
  });

  it("pending decisions stay pinned even behind 50+ newer alerts", async () => {
    const { holdId } = await holdFor("adult", "kid", "KIDS");
    const pendingId = await alertIdFor("guardiana", holdId);
    await prisma.guardianSafetyAlert.update({
      where: { id: pendingId },
      data: { createdAt: new Date(Date.now() - 30 * 86_400_000) },
    });
    const thread = await senderThreadTo("adult", "kid");
    const filler = await prisma.chatMessage.create({ data: { threadId: thread.id, body: "x", fromMe: true } });
    await prisma.guardianSafetyAlert.createMany({
      data: Array.from({ length: 55 }, (_, index) => ({
        guardianUserId: ids.guardiana!,
        childUserId: ids.kid!,
        priority: "medium",
        category: "Hate",
        actionTaken: "Masked",
        status: "ACKNOWLEDGED" as const,
        source: "test",
        chatMessageId: `${filler.id}-${index}`,
      })),
    });
    const cards = await listSafetyAlertCardsForGuardian(ids.guardiana!);
    assert.ok(cards.some((card) => card.id === pendingId), "old pending decision is still listed");
    assert.equal(cards[0]?.statusCode, "AWAITING_DECISION");
  });

  it("guardian → own child: co-guardian decides; sender gets no alert, no strike, can't decide", async () => {
    const participants = await loadDmSafetyParticipants(ids.guardiana!, ids.kid!);
    assert.equal(participants.senderIsRecipientGuardian, true);
    assert.equal(participants.recipient?.monitored, true, "guardian B still monitors");

    const thread = await senderThreadTo("guardiana", "kid");
    const decision = evaluateDmSafetyPolicy({
      flagged: true,
      verificationFailed: false,
      category: "Sexual",
      severity: 4,
      senderZone: participants.sender.zone,
      senderAgeYears: participants.sender.ageYears,
      senderMonitored: false,
      recipientZone: "KIDS",
      recipientAgeYears: 10,
      recipientMonitored: participants.recipient!.monitored,
      senderRestrictedFromMinors: false,
      senderIsRecipientGuardian: true,
    });
    const hold = await createDmModerationHold({
      senderUserId: ids.guardiana!,
      recipientUserId: ids.kid!,
      senderThread: thread,
      body: RAW_BODY,
      category: "Sexual",
      severity: 4,
      senderZone: "ADULT",
      recipientZone: "KIDS",
      treatment: "WITHHELD",
      decision,
    });
    assert.equal(hold.enforcement, null);
    assert.equal(await prisma.senderSafetyStrike.count({ where: { userId: ids.guardiana! } }), 0);

    const alerts = await prisma.guardianSafetyAlert.findMany({ where: { holdId: hold.holdId } });
    assert.deepEqual(
      alerts.map((alert) => alert.guardianUserId),
      [ids.guardianb!],
      "only the co-guardian is asked to decide",
    );

    const self = await decideDmHold(hold.holdId, ids.guardiana!, "allow");
    assert.equal(!self.ok && self.status, 404, "sender can't approve their own message");
    const coGuardian = await decideDmHold(hold.holdId, ids.guardianb!, "allow");
    assert.equal(coGuardian.ok, true);
  });

  it("sole guardian → own child (real moderation): Send anyway isn't offered, nothing is held", async () => {
    const participants = await loadDmSafetyParticipants(ids.guardianc!, ids.youngteen!);
    assert.equal(participants.senderIsRecipientGuardian, true);
    assert.equal(participants.recipient?.monitored, false, "no one else could review it");

    const thread = await senderThreadTo("guardianc", "youngteen");
    const body = "you look sexy, send nudes";
    const first = await sendChatMessage(ids.guardianc!, thread.id, body);
    assert.ok(first && "moderationRequired" in first, `expected warning, got ${JSON.stringify(first)}`);
    if (!first || !("moderationRequired" in first)) return;
    assert.equal(first.moderation.canSendAnyway, false);

    const forced = await sendChatMessage(ids.guardianc!, thread.id, body, { acceptModeration: true });
    assert.ok(forced && "moderationRequired" in forced);
    assert.equal(await prisma.dmModerationHold.count({ where: { senderUserId: ids.guardianc! } }), 0);
    assert.equal(await prisma.senderSafetyStrike.count({ where: { userId: ids.guardianc! } }), 0);
  });
});

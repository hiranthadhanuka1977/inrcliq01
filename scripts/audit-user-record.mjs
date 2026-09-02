/**
 * Audit a user record and related rows for inconsistencies.
 * Usage: node scripts/audit-user-record.mjs <handle> [email]
 */
import { existsSync } from "node:fs";
import dotenv from "dotenv";
import pg from "pg";

function resolveDatabaseUrl() {
  const candidates = [
    process.env.SOURCE_DATABASE_URL,
    process.env.DATABASE_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_PRISMA_URL,
  ].filter(Boolean);

  return candidates.find((url) => !url.includes("[SENSITIVE]")) ?? null;
}

for (const file of [".env.local", ".env", ".env.production.local"]) {
  if (existsSync(file)) dotenv.config({ path: file, override: false });
}

const dbUrlFromEnv = resolveDatabaseUrl();

const handleArg = process.argv[2]?.replace(/^@/, "");
const emailArg = process.argv[3];
const dbUrlArg = process.argv[4];
if (!handleArg) {
  console.error("Usage: node scripts/audit-user-record.mjs <handle> [email] [databaseUrl]");
  process.exit(1);
}

const dbUrl = dbUrlArg || dbUrlFromEnv;
if (!dbUrl) {
  console.error("DATABASE_URL is not configured.");
  process.exit(1);
}

const issues = [];

function note(severity, message, detail) {
  issues.push({ severity, message, detail });
}

function pick(row, keys) {
  return Object.fromEntries(keys.map((key) => [key, row[key]]));
}

async function query(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

async function main() {
  const client = new pg.Client({ connectionString: dbUrl, connectionTimeoutMillis: 20000 });
  await client.connect();

  console.log(`Database: ${new URL(dbUrl).hostname}`);
  console.log(`Auditing handle=@${handleArg}${emailArg ? ` email=${emailArg}` : ""}\n`);

  const users = await query(
    client,
    `SELECT * FROM public."User"
     WHERE handle = $1 OR email = $2 OR ($3::text IS NOT NULL AND email = $3)`,
    [handleArg, emailArg ?? handleArg, emailArg ?? null],
  );

  if (users.length === 0) {
    note("critical", "User not found", { handle: handleArg, email: emailArg ?? null });
    printReport(null, issues);
    await client.end();
    process.exit(3);
  }

  if (users.length > 1) {
    note("critical", "Multiple User rows match handle/email", {
      ids: users.map((u) => u.id),
      emails: users.map((u) => u.email),
      handles: users.map((u) => u.handle),
    });
  }

  const user = users.find((u) => u.handle === handleArg) ?? users.find((u) => u.email === emailArg) ?? users[0];

  if (emailArg && user.email !== emailArg) {
    note("error", "Email mismatch for handle", { expected: emailArg, actual: user.email });
  }
  if (user.handle && user.handle !== handleArg) {
    note("error", "Handle mismatch", { expected: handleArg, actual: user.handle });
  }

  const requiredUserFields = [
    "firstName",
    "lastName",
    "handle",
    "dateOfBirth",
    "country",
    "accountType",
    "emailVerified",
    "onboardingStep",
  ];
  for (const field of requiredUserFields) {
    if (user[field] == null || user[field] === "") {
      note("warn", `User.${field} is missing`, { userId: user.id });
    }
  }

  if (user.accountType !== "MINOR") {
    note("warn", "accountType is not MINOR", { accountType: user.accountType });
  }

  const profile = (await query(client, `SELECT * FROM public."UserProfile" WHERE "userId" = $1`, [user.id]))[0];
  if (!profile) {
    note("critical", "UserProfile row missing", { userId: user.id });
  } else {
    if (profile.handle !== user.handle) {
      note("error", "User.handle differs from UserProfile.handle", {
        userHandle: user.handle,
        profileHandle: profile.handle,
      });
    }
    if (!profile.displayName?.trim()) note("warn", "UserProfile.displayName empty");
    if (!profile.avatarInitials?.trim()) note("warn", "UserProfile.avatarInitials empty");
    if (!profile.avatarColor?.trim()) note("warn", "UserProfile.avatarColor empty");
    if (profile.source === "stub" && user.onboardingStep === "complete") {
      note("info", "Profile still marked as stub despite completed onboarding");
    }
  }

  const creator = (await query(client, `SELECT * FROM public."CreatorUser" WHERE "userId" = $1 OR email = $2`, [
    user.id,
    user.email,
  ]))[0];
  if (!creator) {
    note("warn", "CreatorUser row missing (may be OK for minors)", { userId: user.id });
  } else if (creator.userId !== user.id) {
    note("error", "CreatorUser.userId does not link to User", {
      creatorId: creator.id,
      creatorUserId: creator.userId,
      userId: user.id,
    });
  } else if (creator.handle !== user.handle) {
    note("error", "CreatorUser.handle differs from User.handle", {
      userHandle: user.handle,
      creatorHandle: creator.handle,
    });
  }

  const approvals = await query(
    client,
    `SELECT * FROM public."ParentApprovalRequest" WHERE "childUserId" = $1 ORDER BY "createdAt" DESC`,
    [user.id],
  );
  if (approvals.length === 0) {
    note("critical", "No ParentApprovalRequest for minor", { userId: user.id });
  } else {
    const approved = approvals.filter((r) => r.status === "APPROVED");
    const pending = approvals.filter((r) => r.status === "PENDING");
    if (approved.length === 0) {
      note("error", "No APPROVED parent approval request", {
        statuses: approvals.map((r) => r.status),
      });
    }
    if (pending.length > 0) {
      note("warn", "Pending parent approval still exists", { count: pending.length });
    }
    for (const req of approvals) {
      if (req.status === "APPROVED" && !req.guardianUserId) {
        note("error", "Approved request missing guardianUserId", { requestId: req.id });
      }
      if (req.parentEmail && req.parentEmail.toLowerCase() === user.email.toLowerCase()) {
        note("warn", "Parent approval parentEmail equals child email", { requestId: req.id });
      }
    }
  }

  const guardianLinks = await query(
    client,
    `SELECT gcl.*, gu.email AS guardian_email, gu.handle AS guardian_handle
     FROM public."GuardianChildLink" gcl
     JOIN public."User" gu ON gu.id = gcl."guardianUserId"
     WHERE gcl."childUserId" = $1`,
    [user.id],
  );
  if (guardianLinks.length === 0) {
    note("critical", "No GuardianChildLink for minor", { userId: user.id });
  } else {
    for (const link of guardianLinks) {
      if (!link.protectionLevel) {
        note("warn", "GuardianChildLink.protectionLevel missing", { linkId: link.id });
      }
      const matchingApproval = approvals.find((r) => r.id === link.parentApprovalRequestId);
      if (!link.parentApprovalRequestId) {
        note("warn", "GuardianChildLink.parentApprovalRequestId is null", { linkId: link.id });
      } else if (!matchingApproval) {
        note("error", "GuardianChildLink references missing ParentApprovalRequest", {
          linkId: link.id,
          parentApprovalRequestId: link.parentApprovalRequestId,
        });
      }
    }
  }

  const dmControls = await query(
    client,
    `SELECT * FROM public."GuardianDmContactControl" WHERE "childUserId" = $1`,
    [user.id],
  );
  const threads = await query(client, `SELECT * FROM public."ChatThread" WHERE "userId" = $1`, [user.id]);
  const threadIds = new Set(threads.map((t) => t.id));
  for (const control of dmControls) {
    if (!threadIds.has(control.childThreadId)) {
      note("error", "GuardianDmContactControl references missing ChatThread", {
        controlId: control.id,
        childThreadId: control.childThreadId,
      });
    }
    if (control.peerUserId) {
      const peer = await query(client, `SELECT id, handle, email FROM public."User" WHERE id = $1`, [
        control.peerUserId,
      ]);
      if (peer.length === 0) {
        note("error", "GuardianDmContactControl.peerUserId not found", {
          controlId: control.id,
          peerUserId: control.peerUserId,
        });
      }
    }
  }

  for (const thread of threads) {
    const msgCount = (
      await query(client, `SELECT COUNT(*)::int AS count FROM public."ChatMessage" WHERE "threadId" = $1`, [
        thread.id,
      ])
    )[0].count;
    if (msgCount === 0 && thread.preview) {
      note("warn", "ChatThread has preview but zero messages", {
        threadId: thread.id,
        peerHandle: thread.peerHandle,
      });
    }
  }

  const sessions = await query(client, `SELECT COUNT(*)::int AS count FROM public."Session" WHERE "userId" = $1`, [
    user.id,
  ]);
  const accounts = await query(client, `SELECT * FROM public."Account" WHERE "userId" = $1`, [user.id]);

  printReport(
    {
      user: pick(user, [
        "id",
        "email",
        "emailVerified",
        "firstName",
        "lastName",
        "handle",
        "dateOfBirth",
        "country",
        "region",
        "accountType",
        "signupMethod",
        "onboardingStep",
        "createdAt",
        "updatedAt",
      ]),
      profile: profile
        ? pick(profile, ["id", "handle", "displayName", "slug", "verified", "source", "avatarUrl"])
        : null,
      creator: creator ? pick(creator, ["id", "handle", "userId", "verified", "source"]) : null,
      approvals: approvals.map((r) =>
        pick(r, ["id", "status", "parentEmail", "guardianUserId", "protectionLevel", "resolvedAt", "expiresAt"]),
      ),
      guardianLinks: guardianLinks.map((l) =>
        pick(l, [
          "id",
          "guardianUserId",
          "guardian_email",
          "guardian_handle",
          "protectionLevel",
          "linkedAt",
          "parentApprovalRequestId",
        ]),
      ),
      counts: {
        dmControls: dmControls.length,
        chatThreads: threads.length,
        sessions: sessions[0].count,
        oauthAccounts: accounts.length,
      },
      chatThreads: threads.map((t) =>
        pick(t, ["id", "peerName", "peerHandle", "peerCreatorId", "preview", "lastMessageAt"]),
      ),
    },
    issues,
  );

  await client.end();
  process.exit(issues.some((i) => i.severity === "critical" || i.severity === "error") ? 2 : 0);
}

function printReport(summary, issueList) {
  console.log("=== SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
  console.log("\n=== ISSUES ===");
  if (issueList.length === 0) {
    console.log("No inconsistencies detected.");
    return;
  }
  for (const issue of issueList) {
    console.log(`[${issue.severity.toUpperCase()}] ${issue.message}`);
    if (issue.detail) console.log("  ", JSON.stringify(issue.detail));
  }
  const bySeverity = issueList.reduce((acc, i) => {
    acc[i.severity] = (acc[i.severity] ?? 0) + 1;
    return acc;
  }, {});
  console.log("\nIssue counts:", bySeverity);
}

main().catch((error) => {
  console.error("Audit failed:", error.message);
  process.exit(99);
});

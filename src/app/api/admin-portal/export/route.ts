import { NextResponse } from "next/server";
import { listConsentRegister, toCsv } from "@/lib/admin-portal/lists";
import { listAdminUsers, parseAdminFilters } from "@/lib/admin-portal/queue";
import { STUCK_LABELS } from "@/lib/admin-portal/stuck";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const params = Object.fromEntries(url.searchParams.entries());

  if (kind === "consent") {
    const from = parseDay(params.from, false);
    const to = parseDay(params.to, true);
    const rows = await listConsentRegister(from ?? undefined, to ?? undefined);
    const csv = toCsv(
      ["Child", "Child email", "Guardian", "Guardian email", "Decided", "Protection", "ID document", "Child location", "Lives with guardian"],
      rows.map((row) => [
        row.childName,
        row.childEmail,
        row.guardianName,
        row.guardianEmail,
        row.decidedAt,
        row.protectionLevel,
        row.idDocType,
        row.childLocation,
        row.livesWithGuardian,
      ]),
    );
    return csvResponse(csv, "inrcliq-consent-register.csv");
  }

  if (kind === "queue" || kind === "directory") {
    const filters = parseAdminFilters(params);
    const result = await listAdminUsers(kind, filters, { unpaged: true });
    const csv = toCsv(
      ["Name", "Email", "Handle", "Account type", "Age zone", "Step", "Blocker", "Detail", "Guardian email", "Approval", "Group", "Joined"],
      result.rows.map((row) => [
        row.name,
        row.email,
        row.handle ?? "",
        row.accountType,
        row.ageZoneLabel,
        row.stepLabel,
        row.stuck ? STUCK_LABELS[row.stuck] : "",
        row.detail,
        row.guardianEmail ?? "",
        row.approvalStatus ?? "",
        row.group,
        row.createdAt.toISOString(),
      ]),
    );
    return csvResponse(csv, kind === "queue" ? "inrcliq-onboarding-queue.csv" : "inrcliq-users.csv");
  }

  return NextResponse.json({ error: "Unknown export." }, { status: 400 });
}

function csvResponse(csv: string, filename: string) {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function parseDay(value: string | undefined, endOfDay: boolean) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

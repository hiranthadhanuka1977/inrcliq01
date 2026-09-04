import { simulateExtractedIdNumber } from "@/lib/guardian/constants";
import { resolveGuardianToken } from "@/lib/auth/guardian-flow";
import { deriveUserNameFromEmail } from "@/lib/auth/display-name";
import { getDefaultAdultDob } from "@/lib/form-validation";
import { formatLongDate } from "@/lib/utils/format-dates";

/**
 * Mock-mode identity extraction for the guardian journey.
 *
 * The prototype has always simulated these steps; this only moves the
 * simulation behind the same request/response shape the API uses, so the three
 * route handlers agree with their live counterparts field for field.
 */
export type MockExtractedIdentity = {
  name: string;
  dateOfBirth: string;
  idNumber: string;
  docType: string;
  source: "MOCK";
};

export async function resolveMockIdentity(
  token: string,
  docType = "passport",
): Promise<{ ok: false } | { ok: true; extracted: MockExtractedIdentity }> {
  const verification = await resolveGuardianToken(token);
  if (!verification.ok) return { ok: false };

  const parentEmail = verification.request.parentEmail;
  const dob = getDefaultAdultDob();

  return {
    ok: true,
    extracted: {
      name: deriveUserNameFromEmail(parentEmail).fullName,
      dateOfBirth: formatLongDate(new Date(dob.year, dob.month - 1, dob.day)),
      idNumber: simulateExtractedIdNumber(parentEmail),
      docType,
      source: "MOCK",
    },
  };
}

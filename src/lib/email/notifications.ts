import { getAppUrl } from "@/lib/api-helpers";
import { sendEmailSafely } from "@/lib/email/send";
import {
  buildLoginCodeEmail,
  buildParentApprovedChildEmail,
  buildParentDeclinedChildEmail,
  buildParentInviteEmail,
  buildProfileCompleteEmail,
  buildVerificationEmail,
} from "@/lib/email/templates";

export async function sendVerificationEmail(email: string, verifyUrl: string) {
  const message = buildVerificationEmail(verifyUrl);
  await sendEmailSafely({ to: email, ...message }, "verification");
}

export async function sendLoginCodeEmail(email: string, code: string) {
  const message = buildLoginCodeEmail(code);
  return sendEmailSafely({ to: email, ...message }, "login-code");
}

export async function sendParentInviteEmail(
  parentEmail: string,
  approveUrl: string,
  childFirstName: string,
) {
  const message = buildParentInviteEmail({ childFirstName, approveUrl });
  await sendEmailSafely({ to: parentEmail, ...message }, "parent-invite");
}

export async function sendProfileCompleteEmail(email: string, firstName: string) {
  const message = buildProfileCompleteEmail({
    firstName,
    homeUrl: `${getAppUrl()}/home`,
  });
  await sendEmailSafely({ to: email, ...message }, "profile-complete");
}

export async function sendParentApprovedChildEmail(email: string, firstName: string) {
  const message = buildParentApprovedChildEmail({
    firstName,
    continueUrl: `${getAppUrl()}/onboarding/approved`,
  });
  await sendEmailSafely({ to: email, ...message }, "parent-approved-child");
}

export async function sendParentDeclinedChildEmail(email: string, firstName: string) {
  const message = buildParentDeclinedChildEmail({
    firstName,
    signupUrl: `${getAppUrl()}/`,
  });
  await sendEmailSafely({ to: email, ...message }, "parent-declined-child");
}

const BRAND_COLOR = "#1241A6";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function layout(title: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f7f7f7;font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#222;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #ebebeb;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:${BRAND_COLOR};color:#ffffff;font-size:20px;font-weight:700;">
                InrCliq
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px;font-size:12px;line-height:1.5;color:#717171;">
                You received this email because of activity on your InrCliq account.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(href: string, label: string) {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `<p style="margin:24px 0 0;">
    <a href="${safeHref}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:12px;">
      ${safeLabel}
    </a>
  </p>
  <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#717171;word-break:break-all;">
    Or copy this link:<br />
    <a href="${safeHref}" style="color:${BRAND_COLOR};">${safeHref}</a>
  </p>`;
}

export function buildVerificationEmail(verifyUrl: string) {
  const subject = "Verify your InrCliq email";
  const text = `Verify your email address to continue setting up your InrCliq account.\n\n${verifyUrl}\n\nIf you did not create an account, you can ignore this email.`;
  const html = layout(
    subject,
    `<h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;">Verify your email</h1>
     <p style="margin:0;font-size:16px;line-height:1.6;color:#484848;">
       Thanks for signing up. Confirm your email address to continue setting up your InrCliq account.
     </p>
     ${button(verifyUrl, "Verify email")}`,
  );

  return { subject, text, html };
}

export function buildLoginCodeEmail(code: string) {
  const subject = "Your InrCliq login code";
  const text = `Your InrCliq login code is ${code}. It expires soon.\n\nIf you did not try to log in, you can ignore this email.`;
  const html = layout(
    subject,
    `<h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;">Your login code</h1>
     <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#484848;">
       Enter this one-time code to sign in to InrCliq:
     </p>
     <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:0.24em;color:${BRAND_COLOR};">${escapeHtml(code)}</p>
     <p style="margin:16px 0 0;font-size:14px;line-height:1.5;color:#717171;">
       This code expires soon. If you did not try to log in, you can ignore this email.
     </p>`,
  );

  return { subject, text, html };
}

export function buildParentInviteEmail(params: {
  childFirstName: string;
  approveUrl: string;
}) {
  const childFirstName = escapeHtml(params.childFirstName);
  const subject = `${params.childFirstName} wants to join InrCliq`;
  const text = `${params.childFirstName} has requested your approval to join InrCliq.\n\nReview the request here:\n${params.approveUrl}`;
  const html = layout(
    subject,
    `<h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;">Approval needed</h1>
     <p style="margin:0;font-size:16px;line-height:1.6;color:#484848;">
       <strong>${childFirstName}</strong> has requested your approval to join InrCliq. Review the request and approve or decline it from the link below.
     </p>
     ${button(params.approveUrl, "Review request")}`,
  );

  return { subject, text, html };
}

export function buildProfileCompleteEmail(params: { firstName: string; homeUrl: string }) {
  const firstName = escapeHtml(params.firstName);
  const subject = "Your InrCliq profile is ready";
  const text = `Hi ${params.firstName}, your InrCliq profile setup is complete.\n\nContinue here: ${params.homeUrl}`;
  const html = layout(
    subject,
    `<h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;">You're all set</h1>
     <p style="margin:0;font-size:16px;line-height:1.6;color:#484848;">
       Hi ${firstName}, your profile setup is complete. You can now continue to InrCliq.
     </p>
     ${button(params.homeUrl, "Go to InrCliq")}`,
  );

  return { subject, text, html };
}

export function buildParentApprovedChildEmail(params: {
  firstName: string;
  continueUrl: string;
}) {
  const firstName = escapeHtml(params.firstName);
  const subject = "Your parent approved your InrCliq request";
  const text = `Hi ${params.firstName}, your parent or guardian approved your request to join InrCliq.\n\nContinue signup here: ${params.continueUrl}`;
  const html = layout(
    subject,
    `<h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;">Your parent approved!</h1>
     <p style="margin:0;font-size:16px;line-height:1.6;color:#484848;">
       Hi ${firstName}, your parent or guardian approved your request. You can now continue setting up your InrCliq account.
     </p>
     ${button(params.continueUrl, "Continue signup")}`,
  );

  return { subject, text, html };
}

export function buildParentDeclinedChildEmail(params: { firstName: string; signupUrl: string }) {
  const firstName = escapeHtml(params.firstName);
  const subject = "Your InrCliq signup request was declined";
  const text = `Hi ${params.firstName}, your parent or guardian declined your request to join InrCliq.\n\nYou can start again here: ${params.signupUrl}`;
  const html = layout(
    subject,
    `<h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;">Request declined</h1>
     <p style="margin:0;font-size:16px;line-height:1.6;color:#484848;">
       Hi ${firstName}, your parent or guardian declined your request to join InrCliq. If this was a mistake, you can ask them to review a new request or try a different parent email.
     </p>
     ${button(params.signupUrl, "Back to InrCliq")}`,
  );

  return { subject, text, html };
}

function emailLayout(title: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f7f7f7;font-family:Arial,sans-serif;color:#222;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e5;border-radius:12px;">
      <tr>
        <td style="padding:32px 28px;">
          <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#111;">InrCliq</p>
          <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#111;">${title}</h1>
          ${bodyHtml}
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function actionButton(label: string, href: string) {
  return `<p style="margin:24px 0;">
    <a href="${href}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:999px;font-weight:600;">
      ${label}
    </a>
  </p>
  <p style="margin:0;font-size:13px;line-height:1.5;color:#717171;word-break:break-all;">
    Or copy this link:<br />
    <a href="${href}" style="color:#111;">${href}</a>
  </p>`;
}

export function buildVerificationEmail(verifyUrl: string) {
  const subject = "Verify your InrCliq email";
  const text = `Verify your InrCliq email by opening this link: ${verifyUrl}`;
  const html = emailLayout(
    "Verify your email",
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444;">
      Thanks for signing up. Confirm your email address to continue setting up your InrCliq account.
    </p>
    ${actionButton("Verify email", verifyUrl)}`,
  );

  return { subject, html, text };
}

export function buildParentInviteEmail(childFirstName: string, approveUrl: string) {
  const subject = `${childFirstName} wants to join InrCliq`;
  const text = `${childFirstName} has requested your approval to join InrCliq. Open this link to review the request: ${approveUrl}`;
  const html = emailLayout(
    "Parent approval requested",
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444;">
      <strong>${childFirstName}</strong> has requested your approval to join InrCliq. Review the request and approve or decline it from the link below.
    </p>
    ${actionButton("Review request", approveUrl)}`,
  );

  return { subject, html, text };
}

export function buildLoginCodeEmail(code: string) {
  const subject = "Your InrCliq login code";
  const text = `Your InrCliq login code is ${code}. It expires soon.`;
  const html = emailLayout(
    "Your login code",
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444;">
      Use this code to sign in to your InrCliq account:
    </p>
    <p style="margin:0 0 16px;font-size:32px;line-height:1.2;font-weight:700;letter-spacing:0.2em;color:#111;">
      ${code}
    </p>
    <p style="margin:0;font-size:13px;line-height:1.5;color:#717171;">
      This code expires soon. If you did not request it, you can ignore this email.
    </p>`,
  );

  return { subject, html, text };
}

export function getEmailFrom() {
  let from = process.env.EMAIL_FROM?.trim();
  if (from && from.startsWith('"') && from.endsWith('"')) {
    from = from.slice(1, -1).trim();
  }
  if (from) return from.includes("<") ? from : `InrCliq <${from}>`;
  return "InrCliq <onboarding@resend.dev>";
}

export function isEmailSendingEnabled() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function logEmailDebug(message: string) {
  console.info(message);
}

export function getEmailFrom() {
  const from = process.env.EMAIL_FROM?.trim();
  if (from) return from.includes("<") ? from : `InrCliq <${from}>`;
  return "InrCliq <onboarding@resend.dev>";
}

export function isEmailSendingEnabled() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function logEmailDebug(message: string) {
  console.info(message);
}

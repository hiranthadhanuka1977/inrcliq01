export type EmailProvider = "sendgrid" | "console";

export function getEmailConfig() {
  const provider = (process.env.EMAIL_PROVIDER ?? "console") as EmailProvider;
  const from = process.env.EMAIL_FROM?.trim() ?? "";
  const sendgridApiKey = process.env.SENDGRID_API_KEY?.trim() ?? "";

  return { provider, from, sendgridApiKey };
}

export function assertSendGridConfigured() {
  const { provider, from, sendgridApiKey } = getEmailConfig();

  if (provider !== "sendgrid") {
    return;
  }

  if (!from) {
    throw new Error("EMAIL_FROM is required when EMAIL_PROVIDER=sendgrid.");
  }

  if (!sendgridApiKey) {
    throw new Error("SENDGRID_API_KEY is required when EMAIL_PROVIDER=sendgrid.");
  }
}

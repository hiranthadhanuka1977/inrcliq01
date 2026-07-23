export type EmailProvider = "smtp" | "console";

export function getEmailConfig() {
  const provider = (process.env.EMAIL_PROVIDER ?? "console") as EmailProvider;
  const from = process.env.EMAIL_FROM?.trim() ?? "";
  const fromName = process.env.EMAIL_FROM_NAME?.trim() || "InrCliq";
  const smtpHost = process.env.SMTP_HOST?.trim() ?? "";
  const smtpPort = Number(process.env.SMTP_PORT ?? "587");
  const smtpUser = process.env.SMTP_USER?.trim() ?? "";
  const smtpPass = process.env.SMTP_PASS?.trim() ?? "";
  // Port 465 uses implicit TLS; 587 uses STARTTLS (secure: false).
  const smtpSecure =
    process.env.SMTP_SECURE?.trim().toLowerCase() === "true" || smtpPort === 465;

  return {
    provider,
    from,
    fromName,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    smtpSecure,
  };
}

export function assertSmtpConfigured() {
  const { provider, from, smtpHost, smtpUser, smtpPass } = getEmailConfig();

  if (provider !== "smtp") {
    return;
  }

  if (!from) {
    throw new Error("EMAIL_FROM is required when EMAIL_PROVIDER=smtp.");
  }

  if (!smtpHost) {
    throw new Error("SMTP_HOST is required when EMAIL_PROVIDER=smtp.");
  }

  if (!smtpUser) {
    throw new Error("SMTP_USER is required when EMAIL_PROVIDER=smtp.");
  }

  if (!smtpPass) {
    throw new Error("SMTP_PASS is required when EMAIL_PROVIDER=smtp.");
  }
}

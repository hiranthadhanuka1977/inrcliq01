import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { assertSmtpConfigured, getEmailConfig } from "@/lib/email/config";

export type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

let transporter: Transporter | null = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const { smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure } = getEmailConfig();
  assertSmtpConfigured();

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return transporter;
}

function logConsoleEmail(message: OutboundEmail) {
  const to = message.to.trim().toLowerCase();
  console.info(`[email] To: ${to}\nSubject: ${message.subject}\n${message.text}`);
}

function logSmtpError(error: unknown) {
  console.error("SMTP email error", error);
}

export async function sendEmail(message: OutboundEmail) {
  const { provider, from, fromName } = getEmailConfig();
  const to = message.to.trim().toLowerCase();

  if (provider === "console") {
    logConsoleEmail({ ...message, to });
    return;
  }

  const mailer = getTransporter();

  await mailer.sendMail({
    from: `"${fromName}" <${from}>`,
    to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

/** Sends email without throwing. Falls back to console logging if SMTP fails. */
export async function sendEmailSafely(message: OutboundEmail, context: string) {
  try {
    await sendEmail(message);
    return true;
  } catch (error) {
    logSmtpError(error);
    logConsoleEmail(message);
    console.warn(`[email] ${context}: delivery failed; logged to console instead.`);
    return false;
  }
}

import sgMail from "@sendgrid/mail";
import { assertSendGridConfigured, getEmailConfig } from "@/lib/email/config";

export type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function logConsoleEmail(message: OutboundEmail) {
  const to = message.to.trim().toLowerCase();
  console.info(`[email] To: ${to}\nSubject: ${message.subject}\n${message.text}`);
}

function logSendGridError(error: unknown) {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { body?: unknown; statusCode?: number } }).response;
    console.error("SendGrid error", response?.statusCode, response?.body ?? error);
    return;
  }

  console.error("SendGrid error", error);
}

export async function sendEmail(message: OutboundEmail) {
  const { provider, from, sendgridApiKey } = getEmailConfig();
  const to = message.to.trim().toLowerCase();

  if (provider === "console") {
    logConsoleEmail({ ...message, to });
    return;
  }

  assertSendGridConfigured();
  sgMail.setApiKey(sendgridApiKey);

  await sgMail.send({
    to,
    from: { email: from, name: "InrCliq" },
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

/** Sends email without throwing. Falls back to console logging if SendGrid fails. */
export async function sendEmailSafely(message: OutboundEmail, context: string) {
  try {
    await sendEmail(message);
    return true;
  } catch (error) {
    logSendGridError(error);
    logConsoleEmail(message);
    console.warn(`[email] ${context}: delivery failed; logged to console instead.`);
    return false;
  }
}

import { getEmailFrom, logEmailDebug } from "@/lib/email/config";

type TransactionalEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  debugMessage: string;
};

export type SendEmailResult =
  | { ok: true; sent: boolean }
  | { ok: false; sent: false; error: string };

export async function sendTransactionalEmail(
  input: TransactionalEmailInput,
): Promise<SendEmailResult> {
  logEmailDebug(input.debugMessage);

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: true, sent: false };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: getEmailFrom(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (error) {
    console.error("Resend send failed:", error);
    return { ok: false, sent: false, error: error.message };
  }

  return { ok: true, sent: true };
}

export async function sendTransactionalEmailOrThrow(input: TransactionalEmailInput) {
  const result = await sendTransactionalEmail(input);
  if (!result.ok) {
    throw new Error(result.error || "Unable to send email.");
  }
  return result;
}

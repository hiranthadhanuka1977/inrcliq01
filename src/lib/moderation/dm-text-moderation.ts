import { moderatePostText } from "@/lib/moderation/server-text-moderation";
import type { ImageModerationBlock, ImageModerationResult } from "@/lib/moderation/image-moderation-types";

/**
 * Phrases Azure often scores as severity 0 but are not appropriate toward minors.
 * Used only for DMs when the recipient is under 18.
 */
export const MINOR_DM_SOLICITATION =
  /\b(nude|nudes|naked|topless|boobs|breast|breasts|sexy|sext|sexting|porn|porno|onlyfans|nsfw|undress|strip(?:ping)?|horny|blowjob|handjob|fuck(?:ing)?|cock|dick|pussy|vagina|penis|orgasm|masturbat(?:e|ion)|hook\s*up)\b/i;

function minorSolicitationBlock(): ImageModerationBlock {
  return {
    allowed: false,
    title: "Message may not be appropriate",
    message:
      "You're messaging someone under 18. This looks like sexual or suggestive language. You can edit the message or send it anyway — if you send it, it will appear masked to them.",
    category: "Sexual",
    confidence: 4 / 6,
    predictions: [
      {
        className: "Sexual",
        severity: 4,
        probability: 4 / 6,
      },
    ],
  };
}

function withMinorMaskNote(result: ImageModerationBlock, recipientIsMinor: boolean): ImageModerationBlock {
  if (!recipientIsMinor || result.verificationFailed) return result;
  if (/under 18/i.test(result.message)) return result;
  return {
    ...result,
    message: `${result.message} You're messaging someone under 18.`,
  };
}

/** Azure DM text moderation. Extra solicitation screening when the recipient is a minor. */
export async function moderateDmText(
  text: string,
  options: { recipientIsMinor?: boolean } = {},
): Promise<ImageModerationResult> {
  const recipientIsMinor = Boolean(options.recipientIsMinor);
  const azure = await moderatePostText(text, "dm");

  if (!azure.allowed) {
    return withMinorMaskNote(azure, recipientIsMinor);
  }

  if (recipientIsMinor && MINOR_DM_SOLICITATION.test(text)) {
    return minorSolicitationBlock();
  }

  return azure;
}

/** @deprecated Use moderateDmText */
export async function moderateDmTextToMinor(text: string): Promise<ImageModerationResult> {
  return moderateDmText(text, { recipientIsMinor: true });
}

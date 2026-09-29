import { MINOR_DM_SOLICITATION } from "@/lib/moderation/dm-text-moderation";

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /(?<![\w])\+?(?:[\s.\-()]*\d){7,}(?![\w])/g;
const URL_WITH_SCHEME = /\bhttps?:\/\/[^\s]+/gi;
const URL_WWW = /\bwww\.[^\s]+/gi;
const BARE_DOMAIN = /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|co|me|app|link|ly|gg|tv|info|biz|xyz|uk|lk|in|au|ca|us)(?:\/[^\s]*)?\b/gi;
const HANDLE = /(?<![\w@])@[A-Za-z0-9_.]{2,}/g;

function maskWord(word: string) {
  const letters = word.replace(/\s+/g, "");
  if (letters.length <= 1) return letters;
  return `${letters[0]}${"*".repeat(letters.length - 1)}`;
}

/**
 * Guardian-viewer masking: hides contact details and partially hides explicit words
 * so the guardian can judge intent without reading the full explicit text.
 */
export function lightMaskDmText(text: string): string {
  const lexicon = new RegExp(MINOR_DM_SOLICITATION.source, "gi");

  return text
    .replace(EMAIL, "[email hidden]")
    .replace(PHONE, (match) => {
      const leading = match.match(/^\s*/)?.[0] ?? "";
      return `${leading}[phone hidden]`;
    })
    .replace(URL_WITH_SCHEME, "[link hidden]")
    .replace(URL_WWW, "[link hidden]")
    .replace(BARE_DOMAIN, "[link hidden]")
    .replace(HANDLE, "[handle hidden]")
    .replace(lexicon, (match) => maskWord(match));
}

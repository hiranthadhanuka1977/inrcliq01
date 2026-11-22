export const PASSWORD_OTP_NOTICE_KEY = "inrcliq_password_otp_notice";
export const PASSWORD_OTP_NOTICE_EVENT = "inrcliq-password-otp-notice";

export type PasswordOtpNotice = {
  code: string;
  email: string;
};

export function publishPasswordOtpNotice(notice: PasswordOtpNotice) {
  sessionStorage.setItem(PASSWORD_OTP_NOTICE_KEY, JSON.stringify(notice));
  window.dispatchEvent(new Event(PASSWORD_OTP_NOTICE_EVENT));
}

export function readPasswordOtpNotice(): PasswordOtpNotice | null {
  const raw = sessionStorage.getItem(PASSWORD_OTP_NOTICE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PasswordOtpNotice;
    if (!parsed.code || !parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPasswordOtpNotice() {
  sessionStorage.removeItem(PASSWORD_OTP_NOTICE_KEY);
  window.dispatchEvent(new Event(PASSWORD_OTP_NOTICE_EVENT));
}

export const STUDIO_SPLASH_COOKIE = "inrcliq_studio_splash";

export function clearStudioSplashCookie() {
  document.cookie = `${STUDIO_SPLASH_COOKIE}=; Max-Age=0; path=/`;
}

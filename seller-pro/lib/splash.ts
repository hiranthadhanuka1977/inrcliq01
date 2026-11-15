export const SELLER_PRO_SPLASH_COOKIE = "inrcliq_seller_pro_splash";

export function clearSellerProSplashCookie() {
  document.cookie = `${SELLER_PRO_SPLASH_COOKIE}=; Max-Age=0; path=/`;
}

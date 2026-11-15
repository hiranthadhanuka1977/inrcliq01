import { cookies } from "next/headers";

export const SELLER_PRO_COOKIE = "inrcliq_seller_pro";
export const SELLER_PRO_NAME_COOKIE = "inrcliq_seller_pro_name";

function readName(value: string | undefined) {
  if (!value) return "Seller";
  try {
    return decodeURIComponent(value);
  } catch {
    return "Seller";
  }
}

export async function getSellerProSession() {
  const jar = await cookies();
  const token = jar.get(SELLER_PRO_COOKIE)?.value;
  if (!token) return null;
  return {
    token,
    name: readName(jar.get(SELLER_PRO_NAME_COOKIE)?.value),
  };
}

import path from "node:path";
import { config } from "dotenv";
import { getSellerProSession } from "./session";

let loaded = false;

function loadEnv() {
  if (loaded) return;
  loaded = true;
  const root = path.join(process.cwd(), "..");
  config({ path: path.join(root, ".env") });
  config({ path: path.join(root, ".env.local"), override: true });
}

export function mainOrigin() {
  loadEnv();
  return (process.env.MAIN_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002").replace(
    /\/$/,
    "",
  );
}

export function onMain(pathName: string) {
  if (pathName.startsWith("http://") || pathName.startsWith("https://")) return pathName;
  const origin = mainOrigin();
  return `${origin}${pathName.startsWith("/") ? pathName : `/${pathName}`}`;
}

export class MainApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function mainJson<T>(pathName: string): Promise<T> {
  const session = await getSellerProSession();
  if (!session) throw new MainApiError(401, "Unauthorized");

  let response: Response;
  try {
    response = await fetch(`${mainOrigin()}${pathName}`, {
      headers: { cookie: `inrcliq_session=${session.token}` },
      cache: "no-store",
    });
  } catch {
    throw new MainApiError(502, "InrCliq is not running, so Seller Tools cannot load your catalog.");
  }

  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new MainApiError(
      response.status,
      data && typeof data.error === "string" ? data.error : "Unable to load this section.",
    );
  }
  return data as T;
}

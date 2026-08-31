import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { isLiveBackend } from "@/lib/backend/config";
import { getLiveSessionUser } from "@/lib/backend/session-bridge";
import { clearBackendSession } from "@/lib/backend/session";

export const SESSION_COOKIE = "inrcliq_session";
const SESSION_MAX_AGE_DAYS = 30;

export async function createSession(userId: string) {
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });

  return sessionToken;
}

export async function getSessionUser() {
  // Live mode keeps no session row of its own — the backend's JWTs are the
  // session. Adapted to this shape so pages and routes stay unchanged.
  if (isLiveBackend()) return getLiveSessionUser();

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionToken) return null;

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  });

  if (!session || session.expires < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    return null;
  }

  return session.user;
}

export async function destroySession() {
  if (isLiveBackend()) {
    await clearBackendSession();
    return;
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionToken) {
    await prisma.session.deleteMany({ where: { sessionToken } });
  }
  clearSessionCookie(cookieStore);
}

export function clearSessionCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
) {
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

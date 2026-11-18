import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "inrcliq_session";
const SESSION_MAX_AGE_DAYS = 30;

export async function createSessionRecord(userId: string) {
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  return sessionToken;
}

export async function createSession(userId: string) {
  const sessionToken = await createSessionRecord(userId);
  const expires = new Date(Date.now() + SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

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

export async function getSessionUserByToken(sessionToken: string | null | undefined) {
  if (!sessionToken) return null;

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  });

  if (!session || session.expires < new Date() || session.user.suspendedAt) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    return null;
  }

  return session.user;
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  return getSessionUserByToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function destroySessionByToken(sessionToken: string | null | undefined) {
  if (!sessionToken) return;
  await prisma.session.deleteMany({ where: { sessionToken } });
}

export async function destroySession() {
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

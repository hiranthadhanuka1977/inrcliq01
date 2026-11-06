import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export const STUDIO_COOKIE = "inrcliq_studio";
const SESSION_HOURS = 12;

export async function issueStudioSession(userId: string) {
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  await prisma.studioSession.create({ data: { sessionToken, userId, expires } });
  return { sessionToken, expires };
}

export async function getStudioUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(STUDIO_COOKIE)?.value;
  if (!sessionToken) return null;
  const session = await prisma.studioSession.findUnique({
    where: { sessionToken },
    include: { user: true },
  });
  if (!session || session.expires < new Date() || session.user.suspendedAt) {
    if (session) await prisma.studioSession.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return session.user;
}

export async function destroyStudioSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(STUDIO_COOKIE)?.value;
  if (sessionToken) await prisma.studioSession.deleteMany({ where: { sessionToken } });
  cookieStore.set(STUDIO_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function hashLaunchCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

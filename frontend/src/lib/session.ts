import { cookies } from "next/headers";
import { db } from "./db";
import type { Database, Role } from "@prisma/client";

export const SESSION_COOKIE = "elmar_session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  databases: Database[];
  activeDatabase: Database | null;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: {
        include: { databases: true },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await db.session.delete({ where: { id: session.id } });
    return null;
  }

  const dbs = session.user.databases.map((ud) => ud.database);

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
    databases: dbs,
    activeDatabase: dbs[0] ?? null,
  };
}

export async function createSession(
  userId: string,
  ip?: string,
  userAgent?: string
): Promise<string> {
  const session = await db.session.create({
    data: {
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      ip,
      userAgent,
    },
  });
  return session.token;
}

export async function deleteSession(token: string): Promise<void> {
  await db.session.deleteMany({ where: { token } });
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

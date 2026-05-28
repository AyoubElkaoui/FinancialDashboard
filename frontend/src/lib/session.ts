import { cookies } from "next/headers";
import type { Database, Role } from "@/lib/prisma-types";

export const SESSION_COOKIE = "elmar_session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  databases: Database[];
  activeDatabase: Database | null;
}

const ALL_DATABASES: Database[] = ["SERVICES", "MAINTENANCE", "INTERNATIONAL", "KEYSER"];

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const data = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as {
      email: string;
      role: Role;
      exp: number;
    };
    if (data.exp < Date.now()) return null;
    return {
      id: data.email,
      email: data.email,
      role: data.role,
      databases: ALL_DATABASES,
      activeDatabase: "SERVICES",
    };
  } catch {
    return null;
  }
}

export async function createSession(email: string, role: Role = "ADMIN"): Promise<string> {
  const payload = { email, role, exp: Date.now() + SESSION_TTL_MS };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export async function deleteSession(_token: string): Promise<void> {
  // Cookie is cleared by the logout route directly.
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

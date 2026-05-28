import { NextRequest, NextResponse } from "next/server";
import { deleteSession, SESSION_COOKIE } from "@/lib/session";
import { getSession } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    const session = await getSession();
    if (session) {
      await audit(session.id, "LOGOUT").catch(() => {});
    }
    await deleteSession(token).catch(() => {});
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}

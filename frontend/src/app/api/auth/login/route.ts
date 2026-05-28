import { NextRequest, NextResponse } from "next/server";
import { createSession, SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/session";

// Demo credentials — any email accepted, password must be "Demo2026!"
// or the hardcoded admin account below.
const DEMO_USERS = [
  { email: "admin@elmar.nl",   password: "Demo2026!",  role: "ADMIN"  as const },
  { email: "viewer@elmar.nl",  password: "Demo2026!",  role: "VIEWER" as const },
  { email: "elkaoui.a@gmail.com", password: "Demo2026!", role: "ADMIN" as const },
];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { email?: string; password?: string };
  const { email = "", password = "" } = body;

  const user = DEMO_USERS.find((u) => u.email === email && u.password === password);
  if (!user) {
    await new Promise((r) => setTimeout(r, 300));
    return NextResponse.json({ error: "Ongeldig e-mailadres of wachtwoord" }, { status: 401 });
  }

  const token = await createSession(user.email, user.role);
  const response = NextResponse.json({ requiresTotp: false, user: { email: user.email, role: user.role } });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  });
  return response;
}

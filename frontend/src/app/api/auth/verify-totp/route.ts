import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verify as verifyOtp } from "otplib";
import { db } from "@/lib/db";
import { createSession, SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/session";
import { audit } from "@/lib/audit";

const schema = z.object({
  code: z.string().length(6),
});

// Step 2: verify TOTP code, create real session
export async function POST(req: NextRequest) {
  const partialUserId = req.cookies.get("elmar_partial")?.value;
  if (!partialUserId) {
    return NextResponse.json({ error: "Sessie verlopen, log opnieuw in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Ongeldige code" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: partialUserId },
    include: { databases: true },
  });

  if (!user || !user.totpSecret || !user.totpEnabled) {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 401 });
  }

  const valid = verifyOtp({ token: parse.data.code, secret: user.totpSecret });
  if (!valid) {
    return NextResponse.json({ error: "Ongeldige verificatiecode" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined;
  const ua = req.headers.get("user-agent") ?? undefined;
  const sessionToken = await createSession(user.id, ip ?? undefined, ua);

  await audit(user.id, "LOGIN", { ip: ip ?? undefined });

  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      databases: user.databases.map((d) => d.database),
    },
  });

  response.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  });

  // Clear partial token
  response.cookies.set("elmar_partial", "", { maxAge: 0, path: "/" });

  return response;
}

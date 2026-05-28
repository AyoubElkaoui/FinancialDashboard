import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as argon2 from "argon2";
import { db } from "@/lib/db";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  const { email, password } = parse.data;

  const allowed = await db.allowedEmail.findUnique({ where: { email } });
  if (!allowed) {
    await new Promise((r) => setTimeout(r, 300));
    return NextResponse.json({ error: "Ongeldig e-mailadres of wachtwoord" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { email },
    include: { databases: true },
  });
  if (!user) {
    await new Promise((r) => setTimeout(r, 300));
    return NextResponse.json({ error: "Ongeldig e-mailadres of wachtwoord" }, { status: 401 });
  }

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) {
    await new Promise((r) => setTimeout(r, 300));
    return NextResponse.json({ error: "Ongeldig e-mailadres of wachtwoord" }, { status: 401 });
  }

  const response = NextResponse.json({
    requiresTotp: user.totpEnabled,
    requiresTotpSetup: !user.totpEnabled,
  });

  response.cookies.set("elmar_partial", user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60,
    path: "/",
  });
  return response;
}

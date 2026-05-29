import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as argon2 from "argon2";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { audit } from "@/lib/audit";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8).max(128),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Ongeldig verzoek — wachtwoord minimaal 8 tekens" }, { status: 400 });
  }

  const { currentPassword, newPassword } = parse.data;

  const user = await db.user.findUnique({ where: { id: session.id } });
  if (!user) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });

  const valid = await argon2.verify(user.passwordHash, currentPassword);
  if (!valid) {
    await new Promise(r => setTimeout(r, 300));
    return NextResponse.json({ error: "Huidig wachtwoord is onjuist" }, { status: 401 });
  }

  if (currentPassword === newPassword) {
    return NextResponse.json({ error: "Nieuw wachtwoord moet anders zijn dan het huidige" }, { status: 400 });
  }

  const newHash = await argon2.hash(newPassword);
  await db.user.update({ where: { id: session.id }, data: { passwordHash: newHash } });
  await audit(session.id, "PASSWORD_CHANGED", {});

  return NextResponse.json({ ok: true });
}

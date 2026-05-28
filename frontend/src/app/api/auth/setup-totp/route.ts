import { NextRequest, NextResponse } from "next/server";
import { generateSecret, generateURI, verify as verifyOtp } from "otplib";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const session = await getSession();
  if (session) return session.id;
  const partial = req.cookies.get("elmar_partial")?.value;
  return partial ?? null;
}

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 401 });

  const secret = generateSecret();
  const otpauth = generateURI({ label: user.email, issuer: "Elmar Dashboard", secret });
  const qr = await QRCode.toDataURL(otpauth);

  await db.user.update({
    where: { id: userId },
    data: { totpSecret: secret, totpEnabled: false },
  });

  return NextResponse.json({ secret, qr });
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { code } = await req.json().catch(() => ({})) as { code?: string };
  if (!code) return NextResponse.json({ error: "Code ontbreekt" }, { status: 400 });

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.totpSecret) {
    return NextResponse.json({ error: "Genereer eerst een QR code" }, { status: 400 });
  }

  const valid = verifyOtp({ token: code, secret: user.totpSecret });
  if (!valid) return NextResponse.json({ error: "Ongeldige code" }, { status: 400 });

  await db.user.update({ where: { id: userId }, data: { totpEnabled: true } });

  const response = NextResponse.json({ ok: true });
  response.cookies.set("elmar_partial", "", { maxAge: 0, path: "/" });
  return response;
}

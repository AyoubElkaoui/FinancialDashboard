import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const list = await db.allowedEmail.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const { email } = await req.json().catch(() => ({})) as { email?: string };
  if (!email) return NextResponse.json({ error: "E-mailadres ontbreekt" }, { status: 400 });

  const entry = await db.allowedEmail.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  await audit(session.id, "ALLOWLIST_ADDED", { detail: email });

  return NextResponse.json(entry);
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const { email } = await req.json().catch(() => ({})) as { email?: string };
  if (!email) return NextResponse.json({ error: "E-mailadres ontbreekt" }, { status: 400 });

  await db.allowedEmail.deleteMany({ where: { email } });
  await audit(session.id, "ALLOWLIST_REMOVED", { detail: email });

  return NextResponse.json({ ok: true });
}

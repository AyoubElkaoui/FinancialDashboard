import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  return NextResponse.json([]);
}

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  const { email } = await req.json().catch(() => ({})) as { email?: string };
  if (!email) return NextResponse.json({ error: "E-mailadres ontbreekt" }, { status: 400 });
  return NextResponse.json({ email });
}

export async function DELETE(_req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { role?: string };
  return NextResponse.json({ id, role: body.role ?? "VIEWER" });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  await params;
  return NextResponse.json({ ok: true });
}

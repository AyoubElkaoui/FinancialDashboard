import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  return NextResponse.json({ total: 0, logs: [] });
}

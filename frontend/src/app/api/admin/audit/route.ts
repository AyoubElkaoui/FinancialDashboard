import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const offset = Number(searchParams.get("offset") ?? "0");

  const [total, logs] = await Promise.all([
    db.auditLog.count(),
    db.auditLog.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } } },
    }),
  ]);

  return NextResponse.json({ total, logs });
}

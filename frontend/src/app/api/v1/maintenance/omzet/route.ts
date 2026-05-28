import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getWeekStats, getMaandStats } from "@/lib/mock/maintenance-data";

export async function GET(req: NextRequest) {
  const p       = req.nextUrl.searchParams;
  const periode = p.get("periode") ?? "maand";
  const klantId = p.get("klantId") ?? undefined;
  const n       = Math.min(52, Number(p.get("n") ?? (periode === "week" ? 12 : 12)));

  const data = periode === "week"
    ? getWeekStats(klantId, n)
    : getMaandStats(klantId, n);

  return NextResponse.json(data);
}

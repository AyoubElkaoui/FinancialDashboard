import { NextResponse } from "next/server";
import { getJaarStats, getMaandStats } from "@/lib/mock/maintenance-data";

export async function GET() {
  return NextResponse.json({
    jaarStats: getJaarStats(),
    maandVergelijking: {
      huidigJaar:  getMaandStats(undefined, 12).filter(m => m.jaar === 2026),
      vorigJaar:   getMaandStats(undefined, 24).filter(m => m.jaar === 2025),
    },
  });
}

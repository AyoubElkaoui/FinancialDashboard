import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { MAINTENANCE_KLANTEN, getMaintenanceWerkbonnen, getKlantSummary, getMaandStats, getWeekStats } from "@/lib/mock/maintenance-data";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const klant = MAINTENANCE_KLANTEN.find(k => k.id === id);
  if (!klant) return NextResponse.json({ error: "Klant niet gevonden" }, { status: 404 });

  const werkbonnen = getMaintenanceWerkbonnen()
    .filter(b => b.klantId === id)
    .slice(0, 50);

  return NextResponse.json({
    ...klant,
    summary: getKlantSummary(id),
    weekStats: getWeekStats(id, 8),
    maandStats: getMaandStats(id, 6),
    werkbonnen,
  });
}

import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const database = (req.nextUrl.searchParams.get("database") ?? "MAINTENANCE");
  const now      = new Date();
  const startW   = new Date(now); startW.setDate(now.getDate() - now.getDay() + 1); startW.setHours(0,0,0,0);
  const startM   = new Date(now.getFullYear(), now.getMonth(), 1);
  const startY   = new Date(now.getFullYear(), 0, 1);

  // Top-50 klanten gesorteerd op totaal aantal werkbonnen
  const klantGroups = await db.rmWerkbon.groupBy({
    by:      ["klant"],
    where:   { database: database as never },
    _count:  { bonnummer: true },
    orderBy: { _count: { bonnummer: "desc" } },
    take:    50,
  });

  // Per klant: week/maand/jaar tellingen
  const klantNamen = klantGroups.map(k => k.klant ?? "").filter(Boolean);

  const [weekData, maandData, jaarData] = await Promise.all([
    db.rmWerkbon.groupBy({
      by: ["klant", "status"],
      where: { database: database as never, klant: { in: klantNamen }, datum: { gte: startW } },
      _count: { bonnummer: true },
    }),
    db.rmWerkbon.groupBy({
      by: ["klant", "status"],
      where: { database: database as never, klant: { in: klantNamen }, datum: { gte: startM } },
      _count: { bonnummer: true },
    }),
    db.rmWerkbon.groupBy({
      by: ["klant", "status"],
      where: { database: database as never, klant: { in: klantNamen }, datum: { gte: startY } },
      _count: { bonnummer: true },
    }),
  ]);

  function buildMap(rows: { klant: string | null; status: string; _count: { bonnummer: number } }[]) {
    const m = new Map<string, { openstaand: number; uitgevoerd: number }>();
    for (const r of rows) {
      const k = r.klant ?? "";
      if (!m.has(k)) m.set(k, { openstaand: 0, uitgevoerd: 0 });
      const e = m.get(k)!;
      if (["A","I"].includes(r.status)) e.openstaand += r._count.bonnummer;
      else e.uitgevoerd += r._count.bonnummer;
    }
    return m;
  }

  const weekMap  = buildMap(weekData  as never);
  const maandMap = buildMap(maandData as never);
  const jaarMap  = buildMap(jaarData  as never);

  const data = klantGroups.map(k => {
    const naam  = k.klant ?? "Onbekend";
    const week  = weekMap.get(naam)  ?? { openstaand: 0, uitgevoerd: 0 };
    const maand = maandMap.get(naam) ?? { openstaand: 0, uitgevoerd: 0 };
    const jaar  = jaarMap.get(naam)  ?? { openstaand: 0, uitgevoerd: 0 };
    return {
      klant:      naam,
      totaalBons: k._count.bonnummer,
      week:       { openstaand: week.openstaand,  uitgevoerd: week.uitgevoerd,  totaal: week.openstaand  + week.uitgevoerd  },
      maand:      { openstaand: maand.openstaand, uitgevoerd: maand.uitgevoerd, totaal: maand.openstaand + maand.uitgevoerd },
      jaar:       { openstaand: jaar.openstaand,  uitgevoerd: jaar.uitgevoerd,  totaal: jaar.openstaand  + jaar.uitgevoerd  },
    };
  });

  return Response.json(data);
}

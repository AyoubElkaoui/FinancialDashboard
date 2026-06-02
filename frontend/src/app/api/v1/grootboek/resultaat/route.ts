import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { Database } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const database = req.nextUrl.searchParams.get("database") ?? "SERVICES";

  // Aggregeer per rubriek: D-totaal, C-totaal, saldo
  const rows = await db.rmJournaal.groupBy({
    by: ["rubriekCode", "rubriekOmschr", "typeRubriek", "debetCredit"],
    where: { database: database as Database },
    _sum: { bedrag: true },
    orderBy: [{ typeRubriek: "asc" }, { rubriekCode: "asc" }],
  }).catch(() => []);

  // Groepeer per rubriekCode
  const map = new Map<string, { omschr: string; type: string; debet: number; credit: number }>();
  for (const r of rows) {
    const key = r.rubriekCode;
    if (!map.has(key)) map.set(key, { omschr: r.rubriekOmschr, type: r.typeRubriek, debet: 0, credit: 0 });
    const entry = map.get(key)!;
    if (r.debetCredit === "D") entry.debet  += Number(r._sum.bedrag ?? 0);
    else                        entry.credit += Number(r._sum.bedrag ?? 0);
  }

  const data = [...map.entries()].map(([code, v]) => ({
    REKENINGNUMMER: code,
    OMSCHRIJVING:   v.omschr,
    SOORT:          v.type === "W" ? "W&V" : "Balans",
    DEBET_TOTAAL:   v.debet,
    CREDIT_TOTAAL:  v.credit,
    SALDO:          v.credit - v.debet,
  }));

  return Response.json(data);
}

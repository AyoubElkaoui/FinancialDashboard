import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { Database } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const database = req.nextUrl.searchParams.get("database") ?? "SERVICES";

  // Aggregeer kosten per rubriek uit rm_journaal (debit W-rubrieken)
  const rows = await db.rmJournaal.groupBy({
    by: ["rubriekCode", "rubriekOmschr"],
    where: {
      database:    database as Database,
      debetCredit: "D",
      typeRubriek: "W",
    },
    _sum: { bedrag: true },
    orderBy: { _sum: { bedrag: "desc" } },
  }).catch(() => []);

  const data = rows.map(r => ({
    KOSTENSOORT: r.rubriekOmschr,
    RUBRIEK:     r.rubriekCode,
    BEDRAG:      Number(r._sum.bedrag ?? 0),
  }));

  return Response.json(data);
}

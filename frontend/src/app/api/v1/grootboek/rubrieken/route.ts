import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { Database } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const database = req.nextUrl.searchParams.get("database") ?? "SERVICES";

  const rows = await db.rmJournaal.groupBy({
    by: ["rubriekCode", "rubriekOmschr", "typeRubriek"],
    where: { database: database as Database },
    orderBy: { rubriekCode: "asc" },
  }).catch(() => []);

  const data = rows.map((r, i) => ({
    ID:             i + 1,
    REKENINGNUMMER: r.rubriekCode,
    OMSCHRIJVING:   r.rubriekOmschr,
    TYPE:           r.typeRubriek,
  }));

  return Response.json(data);
}

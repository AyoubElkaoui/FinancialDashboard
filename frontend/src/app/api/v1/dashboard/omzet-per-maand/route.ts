import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const database = req.nextUrl.searchParams.get("database") ?? "SERVICES";

  // Omzet geaggregeerd per jaar + maand uit rm_journaal (credit 8xxx, excl. WIP)
  // rm_journaal bevat laatste 365 dagen
  type MaandRow = { jaar: string; maand: string; omzet: string };

  const rows = await db.$queryRaw<MaandRow[]>`
    SELECT
      EXTRACT(YEAR  FROM datum)::text AS jaar,
      EXTRACT(MONTH FROM datum)::text AS maand,
      SUM(bedrag)::text               AS omzet
    FROM rm_journaal
    WHERE database::text   = ${database}
      AND debet_credit      = 'C'
      AND type_rubriek      = 'W'
      AND rubriek_code LIKE '8%'
      AND rubriek_code NOT IN ('8030','8040','8045')
    GROUP BY jaar, maand
    ORDER BY jaar, maand
  `.catch(() => []);

  // Vertaal naar het formaat dat de dashboard Area-chart verwacht
  const data = rows.map(r => ({
    JAAR:  parseInt(r.jaar),
    MAAND: parseInt(r.maand),
    OMZET: parseFloat(r.omzet),
  }));

  return Response.json(data);
}

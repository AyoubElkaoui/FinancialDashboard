import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getDbDashboardKpis } from "@/lib/mock/elmar-data";
import type { Database } from "@prisma/client";

const DEFAULT_UREN_TARIEF = 7.5;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const database = request.nextUrl.searchParams.get("database") ?? "SERVICES";

  // Controleer of read-model beschikbaar is
  const rows = await db.rmProjectSummary.findMany({
    where: { database: database as Database },
  }).catch(() => []);

  if (rows.length === 0) {
    return Response.json(getDbDashboardKpis(database));
  }

  // App-parameters
  const inputs = await db.projectInput.findMany({
    where: { database: database as Database },
  });
  const inputMap = new Map(inputs.map(i => [i.projectCode, i]));

  let omzetDezeMaand = 0;
  let omzetDitJaar   = 0;
  let openDebiteuren = 0;
  let actieveProj    = 0;

  const now  = new Date();
  const jaar = now.getFullYear();
  const maand = now.getMonth(); // 0-indexed

  for (const row of rows) {
    const input       = inputMap.get(row.projectNr);
    const urenTarief  = Number(input?.urenTarief  ?? DEFAULT_UREN_TARIEF);
    const algKostenPct = Number(input?.algKostenPct ?? 0);
    const gefact      = Number(row.gefactureerd);

    // Omzet dit jaar (benadering: gebruik gesynchroniseerde gefactureerd)
    omzetDitJaar += gefact;

    // Debiteuren (onbetaald saldo)
    const onbet = Number(row.onbetaald);
    if (onbet > 0) openDebiteuren += onbet;

    // Actieve projecten (alles in read-model telt als actief voor nu)
    actieveProj++;
  }

  // Omzet deze maand: simpele benadering — 1/12 van jaartotaal
  // Voor exacte maanddata is rm_journaal nodig (toekomstige verbetering)
  omzetDezeMaand = omzetDitJaar / 12;

  return Response.json({
    omzetDezeMonth:  { OMZET: Math.round(omzetDezeMaand) },
    omzetDitJaar:    { OMZET: Math.round(omzetDitJaar)   },
    openProjecten:   { CNT:   actieveProj                },
    openWerkbonnen:  { CNT:   0                          }, // nog geen Atrium bron
    openDebiteuren:  { BEDRAG: Math.round(openDebiteuren) },
    _source: "read-model",
  });
}

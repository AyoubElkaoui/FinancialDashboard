import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { Database } from "@prisma/client";

const DEFAULT_UREN_TARIEF = 7.5;

// Systeemprojecten uitsluiten: negatieve aanneemsom = correctie/migratie
const SYSTEM_PROJECT_FILTER = { aanneemsom: { gte: 0 } } as const;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const database = request.nextUrl.searchParams.get("database") ?? "SERVICES";

  const rows = await db.rmProjectSummary.findMany({
    where: { database: database as Database, ...SYSTEM_PROJECT_FILTER },
  }).catch(() => []);

  if (rows.length === 0) {
    return Response.json({
      omzetDezeMonth:  { OMZET: 0 },
      omzetDitJaar:    { OMZET: 0 },
      openProjecten:   { CNT: 0 },
      openWerkbonnen:  { CNT: 0 },
      openDebiteuren:  { BEDRAG: 0 },
      _source: "geen-data",
    });
  }

  // App-parameters voor kostenberekening
  const inputs = await db.projectInput.findMany({
    where: { database: database as Database },
  });
  const inputMap = new Map(inputs.map(i => [i.projectCode, i]));

  let omzetDitJaar  = 0;
  let actieveProj   = 0;

  for (const row of rows) {
    const input      = inputMap.get(row.projectNr);
    const gefact     = Number(row.gefactureerd);
    const kostenSynt = Number(row.kostenMateriaal) + Number(row.kostenArbeid) + Number(row.kostenOverig);
    const urenTarief = Number(input?.urenTarief ?? DEFAULT_UREN_TARIEF);
    const algPct     = Number(input?.algKostenPct ?? 0);
    const brutomarge = gefact - (kostenSynt + Number(row.urenTotaal) * urenTarief + kostenSynt * (algPct / 100));
    omzetDitJaar    += gefact;
    // Beschouw project "actief" als het marge > −50% heeft (sluit volledig verliesgevend uit)
    if (brutomarge > -gefact * 0.5 || gefact === 0) actieveProj++;
  }

  // Debiteuren uit rm_sync_meta (company-level 1300-saldo)
  const syncMeta = await db.rmSyncMeta.findUnique({
    where: { database: database as Database },
  }).catch(() => null);
  const openDebiteuren = Number((syncMeta as { totaalDebiteuren?: unknown })?.totaalDebiteuren ?? 0);

  // Omzet afgelopen maand: laatste 30 dagen uit rm_journaal credit 8xxx
  const maandGeleden = new Date();
  maandGeleden.setDate(maandGeleden.getDate() - 30);
  const omzetMaandRows = await db.rmJournaal.findMany({
    where: {
      database:    database as Database,
      debetCredit: "C",
      typeRubriek: "W",
      datum: { gte: maandGeleden },
      NOT: { rubriekCode: { in: ["8030", "8040", "8045"] } },
    },
    select: { bedrag: true, rubriekCode: true },
  }).catch(() => []);
  const omzetDezeMaand = omzetMaandRows
    .filter(r => r.rubriekCode.startsWith("8"))
    .reduce((s, r) => s + Number(r.bedrag), 0);

  return Response.json({
    omzetDezeMonth:  { OMZET: Math.round(omzetDezeMaand) },
    omzetDitJaar:    { OMZET: Math.round(omzetDitJaar) },
    openProjecten:   { CNT: actieveProj },
    openWerkbonnen:  { CNT: 0 },
    openDebiteuren:  { BEDRAG: Math.round(openDebiteuren) },
    _source: "read-model",
  });
}

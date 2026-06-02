import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { Database } from "@prisma/client";

const DEFAULT_UREN_TARIEF = 7.5;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const database = request.nextUrl.searchParams.get("database") ?? "SERVICES";

  const rows = await db.rmProjectSummary.findMany({
    where: { database: database as Database, aanneemsom: { gte: 0 } },
  }).catch(() => []);

  if (rows.length === 0) {
    return Response.json({
      omzetDezeMonth: { OMZET: 0 },
      omzetDitJaar:   { OMZET: 0 },
      openProjecten:  { CNT: 0 },
      openWerkbonnen: { CNT: 0 },
      openDebiteuren: { BEDRAG: 0 },
      _source: "geen-data",
    });
  }

  // App-parameters voor kostenbepaling
  const inputs = await db.projectInput.findMany({ where: { database: database as Database } });
  const inputMap = new Map(inputs.map(i => [i.projectCode, i]));

  let actieveProj = 0;
  for (const row of rows) {
    const input     = inputMap.get(row.projectNr);
    const gefact    = Number(row.gefactureerd);
    const kost      = Number(row.kostenMateriaal) + Number(row.kostenArbeid) + Number(row.kostenOverig);
    const brutomarge = gefact - (kost + Number(row.urenTotaal) * Number(input?.urenTarief ?? DEFAULT_UREN_TARIEF) + kost * (Number(input?.algKostenPct ?? 0) / 100));
    if (brutomarge > -gefact * 0.5 || gefact === 0) actieveProj++;
  }

  // ── Periode-specifieke omzet uit rm_journaal ───────────────────────────────
  const now         = new Date();
  const startJaar   = new Date(now.getFullYear(), 0, 1);
  const startMaand  = new Date(now.getFullYear(), now.getMonth(), 1);
  const eindeMaand  = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  type OmzetSom = { som: string | null };

  // YTD: huidig kalenderjaar
  const ytdResult = await db.$queryRaw<OmzetSom[]>`
    SELECT SUM(bedrag)::text as som
    FROM rm_journaal
    WHERE database::text   = ${database}
      AND debet_credit      = 'C'
      AND type_rubriek      = 'W'
      AND rubriek_code LIKE '8%'
      AND rubriek_code NOT IN ('8030','8040','8045')
      AND datum >= ${startJaar}
  `.catch(() => [{ som: null }]);
  const omzetDitJaar = parseFloat(ytdResult[0]?.som ?? "0") || 0;

  // Huidige kalendermaand
  const maandResult = await db.$queryRaw<OmzetSom[]>`
    SELECT SUM(bedrag)::text as som
    FROM rm_journaal
    WHERE database::text   = ${database}
      AND debet_credit      = 'C'
      AND type_rubriek      = 'W'
      AND rubriek_code LIKE '8%'
      AND rubriek_code NOT IN ('8030','8040','8045')
      AND datum >= ${startMaand}
      AND datum <  ${eindeMaand}
  `.catch(() => [{ som: null }]);
  const omzetDezeMaand = parseFloat(maandResult[0]?.som ?? "0") || 0;

  // ── Debiteuren uit rm_sync_meta ────────────────────────────────────────────
  const syncMeta = await db.rmSyncMeta.findUnique({
    where: { database: database as Database },
  }).catch(() => null);
  const openDebiteuren = Number((syncMeta as Record<string, unknown>)?.totaalDebiteuren ?? 0);

  return Response.json({
    omzetDezeMonth: { OMZET: Math.round(omzetDezeMaand) },
    omzetDitJaar:   { OMZET: Math.round(omzetDitJaar) },
    openProjecten:  { CNT: actieveProj },
    openWerkbonnen: { CNT: 0 },
    openDebiteuren: { BEDRAG: Math.round(openDebiteuren) },
    _periodes: {
      jaar:  now.getFullYear(),
      maand: now.getMonth() + 1,
    },
    _source: "read-model",
  });
}

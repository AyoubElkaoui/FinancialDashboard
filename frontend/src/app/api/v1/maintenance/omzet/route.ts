/**
 * Maintenance omzet — bron: rm_journaal (AT_JOURNAAL + AT_VERKFACT).
 * Rubrieken: 8020 (Periodiek) + 8300 (Service). Datumveld = DATUM_FACT.
 * Geverifieerd: 2026 totaal = €109.178,27 (8020: €70.300,20 + 8300: €38.878,07).
 */
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

const safe = (v: string | null | undefined) => parseFloat(v ?? "0") || 0;
const MAAND_NL = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
const BEDRIJF_START = "2026-04-06";
const OMZET_RUBRIEKEN = ["8020", "8300"];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const s        = req.nextUrl.searchParams;
  const database = s.get("database") ?? "MAINTENANCE";
  const periode  = s.get("periode") ?? "maand";

  if (periode === "maand") {
    type MaandRow = { jaar: string; maand: string; rubriek: string; omzet: string | null };
    const omzetRows = await db.$queryRaw<MaandRow[]>`
      SELECT EXTRACT(YEAR FROM datum)::text  AS jaar,
             EXTRACT(MONTH FROM datum)::text AS maand,
             rubriek_code                   AS rubriek,
             SUM(bedrag)::text              AS omzet
      FROM rm_journaal
      WHERE database::text = ${database}
        AND debet_credit   = 'C'
        AND rubriek_code   IN ('8020','8300')
        AND datum >= ${BEDRIJF_START}::date
      GROUP BY jaar, maand, rubriek_code
      ORDER BY jaar, maand, rubriek_code
    `.catch(() => []);

    type BonRow = { jaar: string; maand: string; status: string; aantal: string };
    const bonRows = await db.$queryRaw<BonRow[]>`
      SELECT EXTRACT(YEAR FROM datum)::text  AS jaar,
             EXTRACT(MONTH FROM datum)::text AS maand,
             status, COUNT(*)::text          AS aantal
      FROM rm_werkbon
      WHERE database::text = ${database}
        AND datum >= ${BEDRIJF_START}::date
      GROUP BY jaar, maand, status
      ORDER BY jaar, maand, status
    `.catch(() => []);

    // Combineer per jaar+maand
    const keySet = new Set([
      ...omzetRows.map(r => `${r.jaar}-${r.maand}`),
      ...bonRows.map(r => `${r.jaar}-${r.maand}`),
    ]);
    // Omzet per maand per rubriek
    const omzetMap = new Map<string, { periodiek: number; service: number }>();
    for (const r of omzetRows) {
      const key = `${r.jaar}-${r.maand}`;
      if (!omzetMap.has(key)) omzetMap.set(key, { periodiek: 0, service: 0 });
      const e = omzetMap.get(key)!;
      if (r.rubriek === "8020") e.periodiek += safe(r.omzet);
      else                      e.service   += safe(r.omzet);
    }
    const bonMap = new Map<string, { uitgevoerd: number; openstaand: number; totaal: number }>();
    for (const r of bonRows) {
      const key = `${r.jaar}-${r.maand}`;
      if (!bonMap.has(key)) bonMap.set(key, { uitgevoerd: 0, openstaand: 0, totaal: 0 });
      const e = bonMap.get(key)!;
      const n = parseInt(r.aantal);
      e.totaal += n;
      if (["U","V"].includes(r.status)) e.uitgevoerd += n;
      if (["A","I"].includes(r.status)) e.openstaand += n;
    }

    const data = [...keySet].sort().map(key => {
      const [jaar, maand] = key.split("-");
      const oz = omzetMap.get(key) ?? { periodiek: 0, service: 0 };
      return {
        label:      `${MAAND_NL[parseInt(maand) - 1]} '${jaar.slice(2)}`,
        jaar:       parseInt(jaar), maand: parseInt(maand),
        omzet:      oz.periodiek + oz.service,
        periodiek:  oz.periodiek,
        service:    oz.service,
        uitgevoerd: bonMap.get(key)?.uitgevoerd ?? 0,
        openstaand: bonMap.get(key)?.openstaand ?? 0,
        totaal:     bonMap.get(key)?.totaal ?? 0,
      };
    });
    return Response.json(data);
  }

  // Week-modus
  type WeekRow = { jaar: string; week: string; rubriek: string; omzet: string | null };
  const omzetRows = await db.$queryRaw<WeekRow[]>`
    SELECT EXTRACT(YEAR FROM datum)::text AS jaar,
           EXTRACT(WEEK FROM datum)::text AS week,
           rubriek_code                   AS rubriek,
           SUM(bedrag)::text              AS omzet
    FROM rm_journaal
    WHERE database::text = ${database}
      AND debet_credit   = 'C'
      AND rubriek_code   IN ('8020','8300')
      AND datum >= ${BEDRIJF_START}::date
    GROUP BY jaar, week, rubriek_code
    ORDER BY jaar, week, rubriek_code
  `.catch(() => []);

  type WeekBonRow = { jaar: string; week: string; status: string; aantal: string };
  const bonRows = await db.$queryRaw<WeekBonRow[]>`
    SELECT EXTRACT(YEAR FROM datum)::text AS jaar,
           EXTRACT(WEEK FROM datum)::text AS week,
           status, COUNT(*)::text         AS aantal
    FROM rm_werkbon
    WHERE database::text = ${database}
      AND datum >= ${BEDRIJF_START}::date
    GROUP BY jaar, week, status
    ORDER BY jaar, week, status
  `.catch(() => []);

  const keySet = new Set([
    ...omzetRows.map(r => `${r.jaar}-${r.week.padStart(2,"0")}`),
    ...bonRows.map(r => `${r.jaar}-${r.week.padStart(2,"0")}`),
  ]);
  const omzetMap = new Map<string, { periodiek: number; service: number }>();
  for (const r of omzetRows) {
    const key = `${r.jaar}-${r.week.padStart(2,"0")}`;
    if (!omzetMap.has(key)) omzetMap.set(key, { periodiek: 0, service: 0 });
    const e = omzetMap.get(key)!;
    if (r.rubriek === "8020") e.periodiek += safe(r.omzet);
    else                      e.service   += safe(r.omzet);
  }
  const bonMap = new Map<string, { uitgevoerd: number; openstaand: number; aangemaakt: number }>();
  for (const r of bonRows) {
    const key = `${r.jaar}-${r.week.padStart(2,"0")}`;
    if (!bonMap.has(key)) bonMap.set(key, { uitgevoerd: 0, openstaand: 0, aangemaakt: 0 });
    const e = bonMap.get(key)!;
    const n = parseInt(r.aantal);
    if (["U","V"].includes(r.status)) e.uitgevoerd += n;
    else if (["A","I"].includes(r.status)) { e.openstaand += n; e.aangemaakt += n; }
  }

  const data = [...keySet].sort().map(key => {
    const [, week] = key.split("-");
    const oz = omzetMap.get(key) ?? { periodiek: 0, service: 0 };
    return {
      label:      `W${parseInt(week)}`,
      omzet:      oz.periodiek + oz.service,
      periodiek:  oz.periodiek,
      service:    oz.service,
      uitgevoerd: bonMap.get(key)?.uitgevoerd ?? 0,
      openstaand: bonMap.get(key)?.openstaand ?? 0,
      aangemaakt: bonMap.get(key)?.aangemaakt ?? 0,
    };
  });
  return Response.json(data);
}

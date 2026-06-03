/**
 * Maintenance omzet + werkbon-tellingen.
 * Omzetbron: rm_werkbon.opbrengsten (AT_KLNTBREG per bon, 100% dekking).
 * Dit is de juiste bron voor Maintenance: facturatie per werkbon.
 * rm_journaal is niet gesyncet voor MAINTENANCE.
 */
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

const safe = (v: string | null | undefined) => parseFloat(v ?? "0") || 0;
const MAAND_NL = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
const BEDRIJF_START = "2026-04-06"; // data vóór deze datum uitsluiten

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const s        = req.nextUrl.searchParams;
  const database = s.get("database") ?? "MAINTENANCE";
  const periode  = s.get("periode") ?? "maand";

  const now = new Date();

  if (periode === "maand") {
    // Opbrengsten per kalendermaand (rm_werkbon.opbrengsten) + werkbon-tellingen
    type MaandRow = { jaar: string; maand: string; opbrengsten: string | null };
    const omzetRows = await db.$queryRaw<MaandRow[]>`
      SELECT EXTRACT(YEAR FROM datum)::text  AS jaar,
             EXTRACT(MONTH FROM datum)::text AS maand,
             SUM(opbrengsten)::text          AS opbrengsten
      FROM rm_werkbon
      WHERE database::text = ${database}
        AND opbrengsten > 0
        AND datum >= ${BEDRIJF_START}::date
      GROUP BY jaar, maand
      ORDER BY jaar, maand
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

    const keySet = new Set([
      ...omzetRows.map(r => `${r.jaar}-${r.maand}`),
      ...bonRows.map(r => `${r.jaar}-${r.maand}`),
    ]);
    const omzetMap = new Map(omzetRows.map(r => [`${r.jaar}-${r.maand}`, safe(r.opbrengsten)]));
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
      return {
        label:      `${MAAND_NL[parseInt(maand) - 1]} '${jaar.slice(2)}`,
        jaar:       parseInt(jaar),
        maand:      parseInt(maand),
        omzet:      omzetMap.get(key) ?? 0,
        uitgevoerd: bonMap.get(key)?.uitgevoerd ?? 0,
        openstaand: bonMap.get(key)?.openstaand ?? 0,
        totaal:     bonMap.get(key)?.totaal ?? 0,
      };
    });
    return Response.json(data);
  }

  // Week-modus: opbrengsten per ISO-week + werkbon-tellingen (rolling 12 weken)
  const twaalf_weken_geleden = new Date(now);
  twaalf_weken_geleden.setDate(now.getDate() - 84);

  type WeekOmzetRow = { jaar: string; week: string; opbrengsten: string | null };
  const omzetRows = await db.$queryRaw<WeekOmzetRow[]>`
    SELECT EXTRACT(YEAR FROM datum)::text AS jaar,
           EXTRACT(WEEK FROM datum)::text AS week,
           SUM(opbrengsten)::text         AS opbrengsten
    FROM rm_werkbon
    WHERE database::text = ${database}
      AND opbrengsten > 0
      AND datum >= ${BEDRIJF_START}::date
    GROUP BY jaar, week
    ORDER BY jaar, week
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
  const omzetMap = new Map(omzetRows.map(r => [`${r.jaar}-${r.week.padStart(2,"0")}`, safe(r.opbrengsten)]));
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
    return {
      label:      `W${parseInt(week)}`,
      omzet:      omzetMap.get(key) ?? 0,
      uitgevoerd: bonMap.get(key)?.uitgevoerd ?? 0,
      openstaand: bonMap.get(key)?.openstaand ?? 0,
      aangemaakt: bonMap.get(key)?.aangemaakt ?? 0,
    };
  });
  return Response.json(data);
}

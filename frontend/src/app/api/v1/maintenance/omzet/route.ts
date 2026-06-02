/**
 * Maintenance omzet + werkbon-tellingen.
 * Periode: ROLLING vensters (geen kalenderweek/maand die leeg kan zijn).
 * Expliciete datumfilter op boekdatum — geen all-time-optelling.
 */
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

const safe = (v: string | null | undefined) => parseFloat(v ?? "0") || 0;
const MAAND_NL = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const s        = req.nextUrl.searchParams;
  const database = s.get("database") ?? "MAINTENANCE";
  const periode  = s.get("periode") ?? "maand";

  const now = new Date();

  if (periode === "maand") {
    // Omzet per kalendermaand uit rm_journaal 8xxx (laatste 12 maanden)
    type MaandRow = { jaar: string; maand: string; omzet: string | null };
    const omzetRows = await db.$queryRaw<MaandRow[]>`
      SELECT EXTRACT(YEAR FROM datum)::text  AS jaar,
             EXTRACT(MONTH FROM datum)::text AS maand,
             SUM(bedrag)::text               AS omzet
      FROM rm_journaal
      WHERE database::text   = ${database}
        AND debet_credit      = 'C'
        AND type_rubriek      = 'W'
        AND rubriek_code LIKE '8%'
        AND rubriek_code NOT IN ('8030','8040','8045')
        AND datum >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY jaar, maand
      ORDER BY jaar, maand
    `.catch(() => []);

    type BonRow = { jaar: string; maand: string; status: string; aantal: string };
    const bonRows = await db.$queryRaw<BonRow[]>`
      SELECT EXTRACT(YEAR FROM datum)::text  AS jaar,
             EXTRACT(MONTH FROM datum)::text AS maand,
             status,
             COUNT(*)::text                  AS aantal
      FROM rm_werkbon
      WHERE database::text = ${database}
        AND datum >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY jaar, maand, status
      ORDER BY jaar, maand, status
    `.catch(() => []);

    // Combineer per jaar+maand
    const keySet = new Set([
      ...omzetRows.map(r => `${r.jaar}-${r.maand}`),
      ...bonRows.map(r => `${r.jaar}-${r.maand}`),
    ]);
    const omzetMap = new Map(omzetRows.map(r => [`${r.jaar}-${r.maand}`, safe(r.omzet)]));
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

  // Week-modus: omzet per ISO-week (rm_journaal) + werkbon-tellingen (rm_werkbon)
  // Rolling 12 weken terug (niet "huidige kalenderweek" die leeg kan zijn)
  const twaalf_weken_geleden = new Date(now);
  twaalf_weken_geleden.setDate(now.getDate() - 84);

  type WeekOmzetRow = { jaar: string; week: string; omzet: string | null };
  const omzetRows = await db.$queryRaw<WeekOmzetRow[]>`
    SELECT EXTRACT(YEAR FROM datum)::text AS jaar,
           EXTRACT(WEEK FROM datum)::text AS week,
           SUM(bedrag)::text              AS omzet
    FROM rm_journaal
    WHERE database::text   = ${database}
      AND debet_credit      = 'C'
      AND type_rubriek      = 'W'
      AND rubriek_code LIKE '8%'
      AND rubriek_code NOT IN ('8030','8040','8045')
      AND datum >= ${twaalf_weken_geleden}
    GROUP BY jaar, week
    ORDER BY jaar, week
  `.catch(() => []);

  type WeekBonRow = { jaar: string; week: string; status: string; aantal: string };
  const bonRows = await db.$queryRaw<WeekBonRow[]>`
    SELECT EXTRACT(YEAR FROM datum)::text AS jaar,
           EXTRACT(WEEK FROM datum)::text AS week,
           status,
           COUNT(*)::text                 AS aantal
    FROM rm_werkbon
    WHERE database::text = ${database}
      AND datum >= ${twaalf_weken_geleden}
    GROUP BY jaar, week, status
    ORDER BY jaar, week, status
  `.catch(() => []);

  const keySet = new Set([
    ...omzetRows.map(r => `${r.jaar}-${r.week.padStart(2,"0")}`),
    ...bonRows.map(r => `${r.jaar}-${r.week.padStart(2,"0")}`),
  ]);
  const omzetMap = new Map(omzetRows.map(r => [`${r.jaar}-${r.week.padStart(2,"0")}`, safe(r.omzet)]));
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

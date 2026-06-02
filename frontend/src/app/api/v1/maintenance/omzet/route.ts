/**
 * Maintenance omzet per week of maand uit rm_journaal (credit 8xxx).
 * Expliciete datumfilter op boekdatum — geen all-time-optelling.
 */
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

const MAAND_NL = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const s       = req.nextUrl.searchParams;
  const database = s.get("database") ?? "MAINTENANCE";
  const periode  = s.get("periode") ?? "maand";   // "maand" | "week"

  if (periode === "maand") {
    // Omzet per kalendermaand, laatste 12 maanden
    type MaandRow = { jaar: string; maand: string; omzet: string };
    const rows = await db.$queryRaw<MaandRow[]>`
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

    const data = rows.map(r => ({
      label: `${MAAND_NL[parseInt(r.maand) - 1]} '${r.jaar.slice(2)}`,
      jaar:  parseInt(r.jaar),
      maand: parseInt(r.maand),
      omzet: parseFloat(r.omzet),
    }));
    return Response.json(data);
  }

  // Werkbon-tellingen per week (voor statusgrafiek)
  const now = new Date();
  const weekAgo8 = new Date(now);
  weekAgo8.setDate(now.getDate() - 56); // 8 weken terug

  type WeekRow = { week: string; jaar: string; aangemaakt: string; uitgevoerd: string; openstaand: string };
  const rows = await db.$queryRaw<WeekRow[]>`
    SELECT
      EXTRACT(WEEK FROM datum)::text  AS week,
      EXTRACT(YEAR FROM datum)::text  AS jaar,
      SUM(CASE WHEN status IN ('A','I') THEN 1 ELSE 0 END)::text AS aangemaakt,
      SUM(CASE WHEN status IN ('U','V') THEN 1 ELSE 0 END)::text AS uitgevoerd,
      SUM(CASE WHEN status IN ('A','I') THEN 1 ELSE 0 END)::text AS openstaand
    FROM rm_werkbon
    WHERE database::text = ${database}
      AND datum >= ${weekAgo8}
    GROUP BY jaar, week
    ORDER BY jaar, week
  `.catch(() => []);

  const data = rows.map(r => ({
    label:      `W${r.week}`,
    aangemaakt: parseInt(r.aangemaakt),
    uitgevoerd: parseInt(r.uitgevoerd),
    openstaand: parseInt(r.openstaand),
  }));
  return Response.json(data);
}

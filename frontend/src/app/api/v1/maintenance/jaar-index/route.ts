/**
 * Jaaromzet en groei t.o.v. voorgaande jaren — Maintenance.
 * Bron: rm_werkbon.opbrengsten (AT_KLNTBREG per bon, 100% dekking).
 */
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const database = (req.nextUrl.searchParams.get("database") ?? "MAINTENANCE");

  // Jaaromzet + werkbontellingen per jaar
  type JaarRow = { jaar: string; omzet: string | null; bons: string };
  const jaarRows = await db.$queryRaw<JaarRow[]>`
    SELECT EXTRACT(YEAR FROM datum)::text AS jaar,
           SUM(opbrengsten)::text         AS omzet,
           COUNT(*)::text                 AS bons
    FROM rm_werkbon
    WHERE database::text = ${database}
    GROUP BY jaar
    ORDER BY jaar DESC
    LIMIT 5
  `.catch(() => []);

  const jaarStats = jaarRows.map((r, i, arr) => {
    const omzet    = parseFloat(r.omzet ?? "0") || 0;
    const vorigeOmzet = i < arr.length - 1 ? (parseFloat(arr[i + 1].omzet ?? "0") || 0) : null;
    const groei    = vorigeOmzet != null && vorigeOmzet > 0
      ? ((omzet - vorigeOmzet) / vorigeOmzet) * 100 : null;
    return {
      jaar:        parseInt(r.jaar),
      omzet,
      werkbonnen:  parseInt(r.bons),
      pctVsVorig:  groei,   // verwachte veldnaam door jaar-index/page.tsx
    };
  });

  // Maand-vergelijking: huidig jaar vs vorig jaar
  const huidigJaar = new Date().getFullYear();
  const vorigJaar  = huidigJaar - 1;

  type MaandRow = { jaar: string; maand: string; omzet: string | null };
  const maandRows = await db.$queryRaw<MaandRow[]>`
    SELECT EXTRACT(YEAR FROM datum)::text  AS jaar,
           EXTRACT(MONTH FROM datum)::text AS maand,
           SUM(opbrengsten)::text          AS omzet
    FROM rm_werkbon
    WHERE database::text = ${database}
      AND opbrengsten > 0
      AND EXTRACT(YEAR FROM datum) IN (${huidigJaar}, ${vorigJaar})
    GROUP BY jaar, maand
    ORDER BY jaar, maand
  `.catch(() => []);

  const MAAND_NL = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];

  const toMaand = (rows: MaandRow[], jaar: number) =>
    rows.filter(r => parseInt(r.jaar) === jaar).map(r => ({
      label: MAAND_NL[parseInt(r.maand) - 1],
      maand: parseInt(r.maand),
      omzet: parseFloat(r.omzet ?? "0") || 0,
    }));

  return Response.json({
    jaarStats,
    maandVergelijking: {
      huidigJaar: toMaand(maandRows, huidigJaar),
      vorigJaar:  toMaand(maandRows, vorigJaar),
    },
  });
}

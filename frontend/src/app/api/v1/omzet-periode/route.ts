/**
 * Gefactureerde omzet per project voor een specifieke periode.
 * Bron: rm_journaal (credit 8xxx, excl. WIP-mutaties).
 * Bruikbaar voor YTD en jaarweergave op de Omzet-pagina.
 */
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

const MAAND_NL = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const s        = req.nextUrl.searchParams;
  const database = s.get("database") ?? "SERVICES";
  const modeRaw  = s.get("mode") ?? "jaar";          // "jaar" | "maand" | "alletijd"
  const jaarRaw  = Number(s.get("jaar") ?? new Date().getFullYear());
  const maandRaw = Number(s.get("maand") ?? new Date().getMonth() + 1); // 1-12

  const now   = new Date();
  const hJaar = now.getFullYear();
  const hMaand = now.getMonth() + 1;

  let dateFrom: Date;
  let dateTo:   Date;
  let periodeLabel: string;

  if (modeRaw === "maand") {
    dateFrom     = new Date(jaarRaw, maandRaw - 1, 1);
    dateTo       = new Date(jaarRaw, maandRaw, 1);
    periodeLabel = `${MAAND_NL[maandRaw - 1]} ${jaarRaw}`;
  } else if (modeRaw === "alletijd") {
    // All-time: gebruik rm_project_summary
    const rows = await db.rmProjectSummary.findMany({
      where: { database: database as never },
      select: { projectNr: true, naam: true, klant: true, aanneemsom: true, gefactureerd: true },
      orderBy: { gefactureerd: "desc" },
      take: 200,
    }).catch(() => []);

    const totaal = rows.reduce((s, r) => s + Number(r.gefactureerd), 0);
    return Response.json({
      periodeLabel: "Alle jaren",
      totaalGefactureerd: totaal,
      projecten: rows.map(r => ({
        PROJECTNUMMER:        r.projectNr,
        NAAM:                 r.naam,
        KLANT:                r.klant,
        AANNEEMSOM:           Number(r.aanneemsom),
        GEFACTUREERD_PERIODE: Number(r.gefactureerd),
      })),
    });
  } else {
    // Jaar-modus (YTD als huidig jaar)
    dateFrom     = new Date(jaarRaw, 0, 1);
    dateTo       = new Date(jaarRaw + 1, 0, 1);
    periodeLabel = jaarRaw === hJaar ? `${jaarRaw} YTD` : String(jaarRaw);
  }

  // Haal omzet per project op uit rm_journaal voor de periode
  type OmzetRow = { project_nr: string; omzet: string };
  const omzetRows = await db.$queryRaw<OmzetRow[]>`
    SELECT project_nr, SUM(bedrag)::text as omzet
    FROM rm_journaal
    WHERE database::text  = ${database}
      AND debet_credit     = 'C'
      AND type_rubriek     = 'W'
      AND rubriek_code LIKE '8%'
      AND rubriek_code NOT IN ('8030','8040','8045')
      AND datum >= ${dateFrom}
      AND datum <  ${dateTo}
    GROUP BY project_nr
    ORDER BY SUM(bedrag) DESC
  `.catch(() => []);

  if (omzetRows.length === 0) {
    return Response.json({ periodeLabel, totaalGefactureerd: 0, projecten: [] });
  }

  // Haal naam/klant/aanneemsom op uit rm_project_summary
  const projectNrs = omzetRows.map(r => r.project_nr);
  const summaries  = await db.rmProjectSummary.findMany({
    where:  { database: database as never, projectNr: { in: projectNrs } },
    select: { projectNr: true, naam: true, klant: true, aanneemsom: true },
  }).catch(() => []);
  const summaryMap = new Map(summaries.map(s => [s.projectNr, s]));

  const projecten = omzetRows.map(r => {
    const s = summaryMap.get(r.project_nr);
    return {
      PROJECTNUMMER:        r.project_nr,
      NAAM:                 s?.naam  ?? r.project_nr,
      KLANT:                s?.klant ?? "",
      AANNEEMSOM:           Number(s?.aanneemsom ?? 0),
      GEFACTUREERD_PERIODE: parseFloat(r.omzet),
    };
  });

  const totaalGefactureerd = projecten.reduce((s, p) => s + p.GEFACTUREERD_PERIODE, 0);

  return Response.json({ periodeLabel, totaalGefactureerd, projecten });
}

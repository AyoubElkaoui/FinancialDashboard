/**
 * Maintenance KPI stats: werkbon-tellingen + omzet.
 * ROLLING vensters — niet "huidige kalenderweek" die leeg kan zijn
 * als er dit jaar later dan Maandag is gestart.
 * "Week" = afgelopen 7 dagen, "Maand" = afgelopen 30 dagen.
 */
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

const safe = (v: string | null | undefined) => parseFloat(v ?? "0") || 0;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const database    = req.nextUrl.searchParams.get("database") ?? "MAINTENANCE";
  const BEDRIJF_START = new Date("2026-04-06"); // data vóór deze datum is leeg/niet relevant

  // Periode-grenzen (besluit Ayoub 2026-06-03: vorige kalenderweek/maand):
  //   Vorige week: date_trunc('week', today) - 7d → date_trunc('week', today)
  //   Vorige maand: date_trunc('month', today) - 1m → date_trunc('month', today)
  //   Huidig jaar YTD: date_trunc('year', today) → now
  type PeriodeRow = { vorige_week_start: Date; vorige_maand_start: Date; jaar_start: Date };
  const periodeRes = await db.$queryRaw<PeriodeRow[]>`
    SELECT
      (date_trunc('week',  CURRENT_DATE) - INTERVAL '7 days') AS vorige_week_start,
      (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month') AS vorige_maand_start,
      date_trunc('year',  CURRENT_DATE) AS jaar_start
  `;
  const p = periodeRes[0];
  const voorWkStart  = new Date(p.vorige_week_start);
  const voorWkEind   = new Date(voorWkStart); voorWkEind.setDate(voorWkStart.getDate() + 7);
  const voorMdStart  = new Date(p.vorige_maand_start);
  const voorMdEind   = new Date(voorMdStart); voorMdEind.setMonth(voorMdStart.getMonth() + 1);
  const startJaar    = new Date(p.jaar_start);

  const [totaal, openstaand, uitgevoerd, weekBons, maandBons] = await Promise.all([
    db.rmWerkbon.count({ where: { database: database as never, datum: { gte: BEDRIJF_START } } }),
    db.rmWerkbon.count({ where: { database: database as never, datum: { gte: BEDRIJF_START }, status: { in: ["A","I"] } } }),
    db.rmWerkbon.count({ where: { database: database as never, datum: { gte: BEDRIJF_START }, status: { in: ["U","V"] } } }),
    db.rmWerkbon.count({ where: { database: database as never, datum: { gte: voorWkStart, lt: voorWkEind } } }),
    db.rmWerkbon.count({ where: { database: database as never, datum: { gte: voorMdStart, lt: voorMdEind } } }),
  ]);

  // Omzet — rolling vensters
  // Omzet uit rm_werkbon.opbrengsten (AT_KLNTBREG per bon, 100% dekking)
  type OmzetRow = { som: string | null };
  const [omzetWeek, omzetMaand, omzetJaar, omzetVorigeM] = await Promise.all([
    db.$queryRaw<OmzetRow[]>`
      SELECT SUM(opbrengsten)::text AS som FROM rm_werkbon
      WHERE database::text = ${database} AND opbrengsten > 0
        AND datum >= ${voorWkStart} AND datum < ${voorWkEind}
    `,
    db.$queryRaw<OmzetRow[]>`
      SELECT SUM(opbrengsten)::text AS som FROM rm_werkbon
      WHERE database::text = ${database} AND opbrengsten > 0
        AND datum >= ${voorMdStart} AND datum < ${voorMdEind}
    `,
    db.$queryRaw<OmzetRow[]>`
      SELECT SUM(opbrengsten)::text AS som FROM rm_werkbon
      WHERE database::text = ${database} AND opbrengsten > 0
        AND datum >= ${startJaar}
    `,
    db.$queryRaw<OmzetRow[]>`
      SELECT SUM(opbrengsten)::text AS som FROM rm_werkbon
      WHERE database::text = ${database} AND opbrengsten > 0
        AND datum >= ${voorMdStart} AND datum < ${voorMdEind}
    `,
  ]);

  // Top klanten (vorige maand)
  const topKlanten = await db.rmWerkbon.groupBy({
    by:      ["klant"],
    where:   { database: database as never, datum: { gte: voorMdStart, lt: voorMdEind } },
    _count:  { bonnummer: true },
    orderBy: { _count: { bonnummer: "desc" } },
    take:    10,
  });

  return Response.json({
    periode: {
      weekStart:  voorWkStart.toISOString().slice(0, 10),
      maandStart: voorMdStart.toISOString().slice(0, 10),
      jaarStart:  startJaar.toISOString().slice(0, 10),
      weekLabel:  "Vorige week",
      maandLabel: "Vorige maand",
    },
    werkbonnen: { totaal, openstaand, uitgevoerd, weekBons, maandBons },
    omzet: {
      week:        safe(omzetWeek[0]?.som),
      maand:       safe(omzetMaand[0]?.som),
      jaar:        safe(omzetJaar[0]?.som),
      vorigeMaand: safe(omzetVorigeM[0]?.som),
    },
    topKlanten: topKlanten.map(k => ({
      klant: k.klant ?? "Onbekend",
      aantalBons: k._count.bonnummer,
    })),
  });
}

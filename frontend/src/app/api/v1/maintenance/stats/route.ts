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

  const database = req.nextUrl.searchParams.get("database") ?? "MAINTENANCE";

  const now    = new Date();
  const dag7   = new Date(now); dag7.setDate(now.getDate() - 7);
  const dag30  = new Date(now); dag30.setDate(now.getDate() - 30);
  const startJaar = new Date(now.getFullYear(), 0, 1);
  const dag30v = new Date(now); dag30v.setDate(now.getDate() - 60);  // vorige 30 dagen

  // Werkbon-tellingen
  const [totaal, openstaand, uitgevoerd, weekBons, maandBons] = await Promise.all([
    db.rmWerkbon.count({ where: { database: database as never } }),
    db.rmWerkbon.count({ where: { database: database as never, status: { in: ["A","I"] } } }),
    db.rmWerkbon.count({ where: { database: database as never, status: { in: ["U","V"] } } }),
    db.rmWerkbon.count({ where: { database: database as never, datum: { gte: dag7 } } }),
    db.rmWerkbon.count({ where: { database: database as never, datum: { gte: dag30 } } }),
  ]);

  // Omzet — rolling vensters
  // Omzet uit rm_werkbon.opbrengsten (AT_KLNTBREG per bon, 100% dekking)
  // rm_journaal is niet gesyncet voor MAINTENANCE
  type OmzetRow = { som: string | null };
  const [omzetWeek, omzetMaand, omzetJaar, omzetVorigeMaand] = await Promise.all([
    db.$queryRaw<OmzetRow[]>`
      SELECT SUM(opbrengsten)::text AS som FROM rm_werkbon
      WHERE database::text = ${database} AND opbrengsten > 0 AND datum >= ${dag7}
    `,
    db.$queryRaw<OmzetRow[]>`
      SELECT SUM(opbrengsten)::text AS som FROM rm_werkbon
      WHERE database::text = ${database} AND opbrengsten > 0 AND datum >= ${dag30}
    `,
    db.$queryRaw<OmzetRow[]>`
      SELECT SUM(opbrengsten)::text AS som FROM rm_werkbon
      WHERE database::text = ${database} AND opbrengsten > 0 AND datum >= ${startJaar}
    `,
    db.$queryRaw<OmzetRow[]>`
      SELECT SUM(opbrengsten)::text AS som FROM rm_werkbon
      WHERE database::text = ${database} AND opbrengsten > 0
      AND datum >= ${dag30v} AND datum < ${dag30}
    `,
  ]);

  // Top klanten (laatste 30 dagen)
  const topKlanten = await db.rmWerkbon.groupBy({
    by:      ["klant"],
    where:   { database: database as never, datum: { gte: dag30 } },
    _count:  { bonnummer: true },
    orderBy: { _count: { bonnummer: "desc" } },
    take:    10,
  });

  return Response.json({
    periode: {
      week7:      dag7.toISOString().slice(0, 10),
      dag30:      dag30.toISOString().slice(0, 10),
      jaar:       startJaar.toISOString().slice(0, 10),
      weekLabel:  "Afgelopen 7 dagen",
      maandLabel: "Afgelopen 30 dagen",
    },
    werkbonnen: { totaal, openstaand, uitgevoerd, weekBons, maandBons },
    omzet: {
      week:        safe(omzetWeek[0]?.som),
      maand:       safe(omzetMaand[0]?.som),
      jaar:        safe(omzetJaar[0]?.som),
      vorigeMaand: safe(omzetVorigeMaand[0]?.som),
    },
    topKlanten: topKlanten.map(k => ({
      klant: k.klant ?? "Onbekend",
      aantalBons: k._count.bonnummer,
    })),
  });
}

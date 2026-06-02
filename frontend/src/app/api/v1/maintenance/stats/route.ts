/**
 * Maintenance KPI stats: werkbon-tellingen + omzet-periodes.
 * Bron: rm_werkbon (tellingen) + rm_journaal (omzet).
 * Expliciete datumfilter — geen all-time-optelling.
 */
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const database = req.nextUrl.searchParams.get("database") ?? "MAINTENANCE";

  const now         = new Date();
  const startWeek   = new Date(now); startWeek.setDate(now.getDate() - now.getDay() + 1); startWeek.setHours(0,0,0,0);
  const startMaand  = new Date(now.getFullYear(), now.getMonth(), 1);
  const startJaar   = new Date(now.getFullYear(), 0, 1);
  const startMaandV = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const eindeMaandV = new Date(now.getFullYear(), now.getMonth(), 1);

  // Werkbon-tellingen per status
  const [totaal, openstaand, uitgevoerd, weekBons, maandBons] = await Promise.all([
    db.rmWerkbon.count({ where: { database: database as never } }),
    db.rmWerkbon.count({ where: { database: database as never, status: { in: ["A","I"] } } }),
    db.rmWerkbon.count({ where: { database: database as never, status: { in: ["U","V"] } } }),
    db.rmWerkbon.count({ where: { database: database as never, datum: { gte: startWeek } } }),
    db.rmWerkbon.count({ where: { database: database as never, datum: { gte: startMaand } } }),
  ]);

  // Omzet (rm_journaal credit 8xxx, expliciete periode)
  type OmzetRow = { som: string | null };
  const [omzetWeek, omzetMaand, omzetJaar, omzetVorigeMaand] = await Promise.all([
    db.$queryRaw<OmzetRow[]>`
      SELECT SUM(bedrag)::text AS som FROM rm_journaal
      WHERE database::text = ${database} AND debet_credit='C' AND type_rubriek='W'
      AND rubriek_code LIKE '8%' AND rubriek_code NOT IN ('8030','8040','8045')
      AND datum >= ${startWeek}
    `,
    db.$queryRaw<OmzetRow[]>`
      SELECT SUM(bedrag)::text AS som FROM rm_journaal
      WHERE database::text = ${database} AND debet_credit='C' AND type_rubriek='W'
      AND rubriek_code LIKE '8%' AND rubriek_code NOT IN ('8030','8040','8045')
      AND datum >= ${startMaand}
    `,
    db.$queryRaw<OmzetRow[]>`
      SELECT SUM(bedrag)::text AS som FROM rm_journaal
      WHERE database::text = ${database} AND debet_credit='C' AND type_rubriek='W'
      AND rubriek_code LIKE '8%' AND rubriek_code NOT IN ('8030','8040','8045')
      AND datum >= ${startJaar}
    `,
    db.$queryRaw<OmzetRow[]>`
      SELECT SUM(bedrag)::text AS som FROM rm_journaal
      WHERE database::text = ${database} AND debet_credit='C' AND type_rubriek='W'
      AND rubriek_code LIKE '8%' AND rubriek_code NOT IN ('8030','8040','8045')
      AND datum >= ${startMaandV} AND datum < ${eindeMaandV}
    `,
  ]);

  // Top klanten (door bons deze maand)
  const topKlanten = await db.rmWerkbon.groupBy({
    by:      ["klant"],
    where:   { database: database as never, datum: { gte: startMaand } },
    _count:  { bonnummer: true },
    orderBy: { _count: { bonnummer: "desc" } },
    take:    10,
  });

  return Response.json({
    periode: {
      week:       startWeek.toISOString().slice(0, 10),
      maand:      startMaand.toISOString().slice(0, 10),
      jaar:       startJaar.toISOString().slice(0, 10),
      maandLabel: now.toLocaleDateString("nl-NL", { month: "long", year: "numeric" }),
    },
    werkbonnen: { totaal, openstaand, uitgevoerd, weekBons, maandBons },
    omzet: {
      week:        parseFloat(omzetWeek[0]?.som ?? "0") || 0,
      maand:       parseFloat(omzetMaand[0]?.som ?? "0") || 0,
      jaar:        parseFloat(omzetJaar[0]?.som ?? "0") || 0,
      vorigeMaand: parseFloat(omzetVorigeMaand[0]?.som ?? "0") || 0,
    },
    topKlanten: topKlanten.map(k => ({
      klant: k.klant ?? "Onbekend",
      aantalBons: k._count.bonnummer,
    })),
  });
}

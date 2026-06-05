/**
 * Klantgroepen Maintenance — gebaseerd op contractcode (AT_WERK.GC_CODE).
 * Alleen 400-reeks werkbonnen. Periode >= BEDRIJFSSTART.
 * Retourneert per klantgroep: status-buckets + techniek-breakdown + omzet.
 */
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { resolveKlantgroep } from "@/config/maintenance-klantgroep-mapping";
import { resolveTechniek, TECHNIEK_VOLGORDE } from "@/config/maintenance-techniek-mapping";
import { MAINTENANCE_START_DATE } from "@/config/maintenance-constants";
import type { Familie } from "@/config/maintenance-klantgroep-mapping";

// ── Hulpfuncties ───────────────────────────────────────────────────────────

function open(s: string)  { return ["A","I"].includes(s); }
function uitg(s: string)  { return ["U","V"].includes(s); }
function aanm(s: string)  { return s === "A"; }
function inbeh(s: string) { return s === "I"; }

interface Buckets { aangemaakt: number; openstaand: number; uitgevoerd: number; totaal: number; }
const emptyB = (): Buckets => ({ aangemaakt: 0, openstaand: 0, uitgevoerd: 0, totaal: 0 });

interface TechniekBuckets { W: Buckets; E: Buckets; CV: Buckets; B: Buckets; Overig: Buckets; }
const emptyT = (): TechniekBuckets => ({
  W: emptyB(), E: emptyB(), CV: emptyB(), B: emptyB(), Overig: emptyB(),
});

interface KlantgroepRow {
  klantgroep: string; familie: Familie;
  all: Buckets; week: Buckets; jaar: Buckets;
  techniek: TechniekBuckets;
  omzet: { periodiek: number; service: number; week: number };
  locaties: { klant: string; werkCode: string; all: Buckets }[];
}

// ── Route ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const database = (req.nextUrl.searchParams.get("database") ?? "MAINTENANCE");
  const START = MAINTENANCE_START_DATE;

  // Vorige volledige week grenzen (Postgres date_trunc)
  type WeekRow = { wk_start: Date; wk_end: Date };
  const weekRes = await db.$queryRaw<WeekRow[]>`
    SELECT
      (date_trunc('week', CURRENT_DATE) - INTERVAL '7 days')::date AS wk_start,
      date_trunc('week', CURRENT_DATE)::date                        AS wk_end
  `;
  const wkStart = new Date(weekRes[0].wk_start);
  const wkEnd   = new Date(weekRes[0].wk_end);
  const jaarStart = new Date(new Date().getFullYear(), 0, 1);

  // Werkbonnen per (werkCode, klant, taakCode, status) + periodes
  type BonRow = {
    werk_code: string; klant: string; taak_code: string | null; status: string;
    totaal: string; is_week: string; is_jaar: string;
  };
  const bonRows = await db.$queryRaw<BonRow[]>`
    SELECT
      werk_code,
      COALESCE(klant,'') AS klant,
      taak_code,
      status,
      COUNT(*)::text AS totaal,
      SUM(CASE WHEN datum >= ${wkStart} AND datum < ${wkEnd} THEN 1 ELSE 0 END)::text AS is_week,
      SUM(CASE WHEN datum >= ${jaarStart} THEN 1 ELSE 0 END)::text AS is_jaar
    FROM rm_werkbon
    WHERE database::text = ${database}
      AND werk_code LIKE '400%'
      AND datum >= ${START}
    GROUP BY werk_code, klant, taak_code, status
    ORDER BY werk_code, klant, taak_code, status
  `.catch(() => [] as BonRow[]);

  // Omzet per klantgroep (rm_journaal 8020+8300)
  type OmzetRow = { project_nr: string; rubriek_code: string; omzet: string; week_omzet: string };
  const omzetRows = await db.$queryRaw<OmzetRow[]>`
    SELECT
      project_nr,
      rubriek_code,
      SUM(bedrag)::text AS omzet,
      SUM(CASE WHEN datum >= ${wkStart} AND datum < ${wkEnd} THEN bedrag ELSE 0 END)::text AS week_omzet
    FROM rm_journaal
    WHERE database::text = ${database}
      AND debet_credit   = 'C'
      AND rubriek_code   IN ('8020','8300')
      AND datum >= ${START}
    GROUP BY project_nr, rubriek_code
  `.catch(() => [] as OmzetRow[]);

  // Bouw klantgroep-map
  const kgMap = new Map<string, KlantgroepRow>();
  const locMap = new Map<string, { klant: string; werkCode: string; all: Buckets }>();

  const add = (b: Buckets, s: string, n: number) => {
    b.totaal += n;
    if (aanm(s))  b.aangemaakt += n;
    if (inbeh(s)) b.openstaand += n;
    if (open(s))  b.openstaand += n;
    if (uitg(s))  b.uitgevoerd += n;
  };
  // aangemaakt en openstaand apart voor de tabel:
  const addExact = (b: Buckets, s: string, n: number) => {
    b.totaal += n;
    if (s === 'A') b.aangemaakt += n;
    if (s === 'I') b.openstaand += n;
    if (uitg(s))   b.uitgevoerd += n;
  };

  for (const r of bonRows) {
    const n  = parseInt(r.totaal);
    const nW = parseInt(r.is_week);
    const nJ = parseInt(r.is_jaar);
    const { klantgroep, familie } = resolveKlantgroep(r.werk_code);
    const tech = resolveTechniek(r.taak_code);
    const locKey = `${klantgroep}||${r.werk_code}||${r.klant}`;

    if (!kgMap.has(klantgroep)) {
      kgMap.set(klantgroep, {
        klantgroep, familie,
        all:      emptyB(), week: emptyB(), jaar: emptyB(),
        techniek: emptyT(),
        omzet:    { periodiek: 0, service: 0, week: 0 },
        locaties: [],
      });
    }
    const kg = kgMap.get(klantgroep)!;
    addExact(kg.all,  r.status, n);
    addExact(kg.week, r.status, nW);
    addExact(kg.jaar, r.status, nJ);
    addExact(kg.techniek[tech], r.status, n);

    if (!locMap.has(locKey)) {
      locMap.set(locKey, { klant: r.klant, werkCode: r.werk_code, all: emptyB() });
    }
    addExact(locMap.get(locKey)!.all, r.status, n);
  }

  // Koppel omzet aan klantgroepen
  for (const r of omzetRows) {
    const { klantgroep } = resolveKlantgroep(r.project_nr);
    const kg = kgMap.get(klantgroep);
    if (!kg) continue;
    const bedrag = parseFloat(r.omzet) || 0;
    const weekBedrag = parseFloat(r.week_omzet) || 0;
    if (r.rubriek_code === '8020') { kg.omzet.periodiek += bedrag; kg.omzet.week += weekBedrag; }
    if (r.rubriek_code === '8300') { kg.omzet.service   += bedrag; kg.omzet.week += weekBedrag; }
  }

  // Koppel locaties
  for (const loc of locMap.values()) {
    const { klantgroep } = resolveKlantgroep(loc.werkCode);
    kgMap.get(klantgroep)?.locaties.push(loc);
  }
  for (const kg of kgMap.values()) {
    kg.locaties.sort((a, b) => b.all.totaal - a.all.totaal);
  }

  // Sorteer op familie volgorde + totaal
  const FSORT: Record<string, number> = { Bestseller: 0, 'AS Watson': 1, CeX: 2 };
  const klantgroepen = [...kgMap.values()].sort((a, b) => {
    const fa = a.familie ? FSORT[a.familie] ?? 3 : 3;
    const fb = b.familie ? FSORT[b.familie] ?? 3 : 3;
    return fa !== fb ? fa - fb : b.all.totaal - a.all.totaal;
  });

  return Response.json({
    klantgroepen,
    periodes: {
      start:      START.toISOString().slice(0, 10),
      weekStart:  wkStart.toISOString().slice(0, 10),
      weekEind:   wkEnd.toISOString().slice(0, 10),
      jaarStart:  jaarStart.toISOString().slice(0, 10),
    },
  });
}

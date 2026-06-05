/**
 * Klantgroepen Maintenance — Excel-tabblad-stijl.
 * Per klantgroep: totalen + techniek-breakdown per week/jaar + omzet.
 * Periode >= BEDRIJFSSTART, alleen 400-contracten.
 */
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { resolveKlantgroep } from "@/config/maintenance-klantgroep-mapping";
import { resolveTechniek } from "@/config/maintenance-techniek-mapping";
import { MAINTENANCE_START_DATE } from "@/config/maintenance-constants";
import type { Familie } from "@/config/maintenance-klantgroep-mapping";

interface ExBuckets { aangemaakt: number; uitgevoerd: number; openstaand: number; totaal: number; }
const empty = (): ExBuckets => ({ aangemaakt: 0, uitgevoerd: 0, openstaand: 0, totaal: 0 });

interface TechPeriodes { all: ExBuckets; jaar: ExBuckets; week: ExBuckets; }
const emptyTP = (): TechPeriodes => ({ all: empty(), jaar: empty(), week: empty() });

type TechKey = 'W' | 'E' | 'CV' | 'B' | 'Overig';
interface TechniekMap { W: TechPeriodes; E: TechPeriodes; CV: TechPeriodes; B: TechPeriodes; Overig: TechPeriodes; }
const emptyTech = (): TechniekMap => ({ W: emptyTP(), E: emptyTP(), CV: emptyTP(), B: emptyTP(), Overig: emptyTP() });

interface LocRij { klant: string; werkCode: string; all: ExBuckets; }

export interface KlantgroepBlok {
  klantgroep: string; familie: Familie;
  all:  ExBuckets; jaar: ExBuckets; week: ExBuckets;
  techniek: TechniekMap;
  omzet: { periodiek: number; service: number; week: number; };
  locaties: LocRij[];
}

export interface KlantenApiResponse {
  klantgroepen: KlantgroepBlok[];
  periodes: { start: string; weekStart: string; weekEind: string; };
}

function add(b: ExBuckets, status: string, n: number) {
  b.totaal += n;
  if (status === 'A') { b.aangemaakt += n; }
  if (status === 'I') { b.openstaand += n; }
  if (status === 'U' || status === 'V') { b.uitgevoerd += n; }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const database = (req.nextUrl.searchParams.get("database") ?? "MAINTENANCE");
  const START    = MAINTENANCE_START_DATE;

  // Periode-grenzen (vorige volledige kalenderweek)
  type WR = { wk_start: Date; wk_end: Date };
  const wr = await db.$queryRaw<WR[]>`
    SELECT (date_trunc('week', CURRENT_DATE) - INTERVAL '7 days')::date AS wk_start,
            date_trunc('week', CURRENT_DATE)::date                        AS wk_end
  `;
  const wkStart   = new Date(wr[0].wk_start);
  const wkEnd     = new Date(wr[0].wk_end);
  const jaarStart = new Date(new Date().getFullYear(), 0, 1);

  // Werkbonnen per (werkCode, klant, taakCode, status) + periode-vlaggen
  type BR = { werk_code: string; klant: string; taak_code: string | null; status: string;
              totaal: string; is_week: string; is_jaar: string; };
  const bonRows = await db.$queryRaw<BR[]>`
    SELECT werk_code, COALESCE(klant,'') AS klant, taak_code, status,
           COUNT(*)::text AS totaal,
           SUM(CASE WHEN datum >= ${wkStart} AND datum < ${wkEnd}  THEN 1 ELSE 0 END)::text AS is_week,
           SUM(CASE WHEN datum >= ${jaarStart}                      THEN 1 ELSE 0 END)::text AS is_jaar
    FROM rm_werkbon
    WHERE database::text = ${database}
      AND werk_code LIKE '400%'
      AND datum >= ${START}
    GROUP BY werk_code, klant, taak_code, status
    ORDER BY werk_code, klant, taak_code, status
  `.catch(() => [] as BR[]);

  // Omzet per contractcode (8020+8300)
  type OR = { project_nr: string; rubriek_code: string; omzet: string; week_omzet: string; };
  const omzetRows = await db.$queryRaw<OR[]>`
    SELECT project_nr, rubriek_code,
           SUM(bedrag)::text AS omzet,
           SUM(CASE WHEN datum >= ${wkStart} AND datum < ${wkEnd} THEN bedrag ELSE 0 END)::text AS week_omzet
    FROM rm_journaal
    WHERE database::text = ${database}
      AND debet_credit   = 'C'
      AND rubriek_code   IN ('8020','8300')
      AND datum >= ${START}
    GROUP BY project_nr, rubriek_code
  `.catch(() => [] as OR[]);

  // Aggregeer
  const kgMap  = new Map<string, KlantgroepBlok>();
  const locMap = new Map<string, LocRij>();

  for (const r of bonRows) {
    const n  = parseInt(r.totaal);
    const nW = parseInt(r.is_week);
    const nJ = parseInt(r.is_jaar);
    const { klantgroep, familie } = resolveKlantgroep(r.werk_code);
    const tech = resolveTechniek(r.taak_code) as TechKey;

    if (!kgMap.has(klantgroep)) {
      kgMap.set(klantgroep, { klantgroep, familie,
        all: empty(), jaar: empty(), week: empty(),
        techniek: emptyTech(),
        omzet: { periodiek: 0, service: 0, week: 0 },
        locaties: [],
      });
    }
    const kg = kgMap.get(klantgroep)!;
    add(kg.all,  r.status, n);
    add(kg.jaar, r.status, nJ);
    add(kg.week, r.status, nW);
    add(kg.techniek[tech].all,  r.status, n);
    add(kg.techniek[tech].jaar, r.status, nJ);
    add(kg.techniek[tech].week, r.status, nW);

    const lk = `${klantgroep}||${r.werk_code}||${r.klant}`;
    if (!locMap.has(lk)) locMap.set(lk, { klant: r.klant, werkCode: r.werk_code, all: empty() });
    add(locMap.get(lk)!.all, r.status, n);
  }

  for (const o of omzetRows) {
    const { klantgroep } = resolveKlantgroep(o.project_nr);
    const kg = kgMap.get(klantgroep); if (!kg) continue;
    const b = parseFloat(o.omzet) || 0;
    const w = parseFloat(o.week_omzet) || 0;
    if (o.rubriek_code === '8020') { kg.omzet.periodiek += b; kg.omzet.week += w; }
    if (o.rubriek_code === '8300') { kg.omzet.service   += b; kg.omzet.week += w; }
  }

  for (const loc of locMap.values()) {
    const { klantgroep } = resolveKlantgroep(loc.werkCode);
    kgMap.get(klantgroep)?.locaties.push(loc);
  }
  for (const kg of kgMap.values()) kg.locaties.sort((a,b) => b.all.totaal - a.all.totaal);

  const FS: Record<string, number> = { Bestseller: 0, 'AS Watson': 1, CeX: 2 };
  const klantgroepen = [...kgMap.values()].sort((a,b) => {
    const fa = a.familie ? FS[a.familie] ?? 3 : 3;
    const fb = b.familie ? FS[b.familie] ?? 3 : 3;
    return fa !== fb ? fa - fb : b.all.totaal - a.all.totaal;
  });

  return Response.json({
    klantgroepen,
    periodes: {
      start:     START.toISOString().slice(0, 10),
      weekStart: wkStart.toISOString().slice(0, 10),
      weekEind:  new Date(wkEnd.getTime() - 86400000).toISOString().slice(0, 10),
    },
  } satisfies KlantenApiResponse);
}

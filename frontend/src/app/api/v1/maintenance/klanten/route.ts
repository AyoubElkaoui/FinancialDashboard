/**
 * Klantgroepen Maintenance — Excel-tabblad-stijl.
 * Statussen: A=te_doen, I=loopt, U+V=gedaan. Altijd: te_doen+loopt+gedaan==totaal.
 * Periode >= BEDRIJFSSTART, alleen 400-contracten.
 */
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { resolveKlantgroep } from "@/config/maintenance-klantgroep-mapping";
import { resolveTechniek } from "@/config/maintenance-techniek-mapping";
import { MAINTENANCE_START_DATE } from "@/config/maintenance-constants";
import type { StandBuckets, TechBucket, TechniekMap, KlantgroepBlok, KlantenApiResponse } from "@/types/maintenance-klanten";

const emptyS = (): StandBuckets => ({ totaal: 0, te_doen: 0, loopt: 0, gedaan: 0 });
const emptyT = (): TechBucket  => ({ all: emptyS(), jaar: emptyS(), week: emptyS() });
const emptyTM = (): TechniekMap => ({ W: emptyT(), E: emptyT(), CV: emptyT(), B: emptyT(), Overig: emptyT() });

type TechKey = 'W' | 'E' | 'CV' | 'B' | 'Overig';

function add(b: StandBuckets, status: string, n: number) {
  b.totaal += n;
  if (status === 'A')                       b.te_doen += n;
  else if (status === 'I')                  b.loopt   += n;
  else if (status === 'U' || status === 'V') b.gedaan  += n;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const database = req.nextUrl.searchParams.get("database") ?? "MAINTENANCE";
  const START    = MAINTENANCE_START_DATE;

  type WR = { wk_start: Date; wk_end: Date };
  const wr = await db.$queryRaw<WR[]>`
    SELECT (date_trunc('week', CURRENT_DATE) - INTERVAL '7 days')::date AS wk_start,
            date_trunc('week', CURRENT_DATE)::date                        AS wk_end
  `;
  const wkStart   = new Date(wr[0].wk_start);
  const wkEnd     = new Date(wr[0].wk_end);
  const jaarStart = new Date(new Date().getFullYear(), 0, 1);

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
  `.catch(() => [] as BR[]);

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

  const kgMap  = new Map<string, KlantgroepBlok>();
  const locSet = new Map<string, { klant: string; werkCode: string; all: StandBuckets }>();

  for (const r of bonRows) {
    const n  = parseInt(r.totaal);
    const nW = parseInt(r.is_week);
    const nJ = parseInt(r.is_jaar);
    const { klantgroep, familie } = resolveKlantgroep(r.werk_code);
    const tech = resolveTechniek(r.taak_code) as TechKey;

    if (!kgMap.has(klantgroep)) {
      kgMap.set(klantgroep, { klantgroep, familie,
        all: emptyS(), jaar: emptyS(), week: emptyS(),
        techniek: emptyTM(),
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
    if (!locSet.has(lk)) locSet.set(lk, { klant: r.klant, werkCode: r.werk_code, all: emptyS() });
    add(locSet.get(lk)!.all, r.status, n);
  }

  for (const o of omzetRows) {
    const { klantgroep } = resolveKlantgroep(o.project_nr);
    const kg = kgMap.get(klantgroep); if (!kg) continue;
    const b = parseFloat(o.omzet) || 0;
    const w = parseFloat(o.week_omzet) || 0;
    if (o.rubriek_code === '8020') { kg.omzet.periodiek += b; kg.omzet.week += w; }
    if (o.rubriek_code === '8300') { kg.omzet.service   += b; kg.omzet.week += w; }
  }

  for (const loc of locSet.values()) {
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
  } as KlantenApiResponse);
}

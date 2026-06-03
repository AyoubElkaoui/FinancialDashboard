/**
 * Klantgroepen Maintenance — gebaseerd op contractcode (AT_WERK.GC_CODE).
 * Alleen 400-reeks werkbonnen (27.072). Niet-400 (284, 1%) uitgesloten.
 * Periode: rolling 7d / 30d / huidig jaar — consistent met Index-pagina.
 */
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { resolveKlantgroep } from "@/config/maintenance-klantgroep-mapping";
import type { Familie } from "@/config/maintenance-klantgroep-mapping";

// ── Hulpfuncties ───────────────────────────────────────────────────────────

function open(status: string) { return ["A","I"].includes(status); }
function uitg(status: string) { return ["U","V"].includes(status); }

interface Buckets {
  open: number; uitg: number; totaal: number;
}
const emptyBuckets = (): Buckets => ({ open: 0, uitg: 0, totaal: 0 });

// ── Types ──────────────────────────────────────────────────────────────────

interface LocatieRow {
  klant:    string;
  werkCode: string;
  all:      Buckets;
  week:     Buckets;
  maand:    Buckets;
  jaar:     Buckets;
}

interface KlantgroepRow {
  klantgroep: string;
  familie:    Familie;
  all:        Buckets;
  week:       Buckets;
  maand:      Buckets;
  jaar:       Buckets;
  locaties:   LocatieRow[];
}

// ── Route ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const database = (req.nextUrl.searchParams.get("database") ?? "MAINTENANCE");

  // Rolling-vensters (consistent met Index-pagina bron GC_BOEKDATUM)
  const now      = new Date();
  const dag7     = new Date(now); dag7.setDate(now.getDate() - 7);
  const dag30    = new Date(now); dag30.setDate(now.getDate() - 30);
  const jaarStart = new Date(now.getFullYear(), 0, 1);

  // Per (werkCode, klant, status) — 400-reeks only — met periode-vlaggen
  type Row = {
    werk_code: string;
    klant:     string | null;
    status:    string;
    totaal:    string;
    is_week:   string;
    is_maand:  string;
    is_jaar:   string;
  };

  const rows = await db.$queryRaw<Row[]>`
    SELECT
      werk_code,
      COALESCE(klant, '') AS klant,
      status,
      COUNT(*)::text AS totaal,
      SUM(CASE WHEN datum >= ${dag7}     THEN 1 ELSE 0 END)::text AS is_week,
      SUM(CASE WHEN datum >= ${dag30}    THEN 1 ELSE 0 END)::text AS is_maand,
      SUM(CASE WHEN datum >= ${jaarStart} THEN 1 ELSE 0 END)::text AS is_jaar
    FROM rm_werkbon
    WHERE database::text = ${database}
      AND werk_code LIKE '400%'
    GROUP BY werk_code, klant, status
    ORDER BY werk_code, klant, status
  `.catch(() => [] as Row[]);

  // ── Aggregeer per klantgroep & locatie in Node.js ─────────────────────

  const klantgroepMap = new Map<string, KlantgroepRow>();
  // locaties geïndexeerd op klantgroep+klant+werkCode
  const locatieMap = new Map<string, LocatieRow>();

  for (const r of rows) {
    const n     = parseInt(r.totaal);
    const nW    = parseInt(r.is_week);
    const nM    = parseInt(r.is_maand);
    const nJ    = parseInt(r.is_jaar);
    const isO   = open(r.status);
    const isU   = uitg(r.status);

    const { klantgroep, familie } = resolveKlantgroep(r.werk_code);
    const locKey = `${klantgroep}||${r.werk_code}||${r.klant ?? ""}`;

    // Klantgroep
    if (!klantgroepMap.has(klantgroep)) {
      klantgroepMap.set(klantgroep, {
        klantgroep, familie,
        all: emptyBuckets(), week: emptyBuckets(),
        maand: emptyBuckets(), jaar: emptyBuckets(),
        locaties: [],
      });
    }
    const kg = klantgroepMap.get(klantgroep)!;
    kg.all.totaal += n;  if (isO) kg.all.open += n;  if (isU) kg.all.uitg += n;
    kg.week.totaal  += nW; if (isO) kg.week.open  += nW; if (isU) kg.week.uitg  += nW;
    kg.maand.totaal += nM; if (isO) kg.maand.open += nM; if (isU) kg.maand.uitg += nM;
    kg.jaar.totaal  += nJ; if (isO) kg.jaar.open  += nJ; if (isU) kg.jaar.uitg  += nJ;

    // Locatie (werkCode + klant-naam)
    if (!locatieMap.has(locKey)) {
      locatieMap.set(locKey, {
        klant:    r.klant ?? "",
        werkCode: r.werk_code,
        all: emptyBuckets(), week: emptyBuckets(),
        maand: emptyBuckets(), jaar: emptyBuckets(),
      });
    }
    const loc = locatieMap.get(locKey)!;
    loc.all.totaal += n;  if (isO) loc.all.open += n;  if (isU) loc.all.uitg += n;
    loc.week.totaal  += nW; if (isO) loc.week.open  += nW; if (isU) loc.week.uitg  += nW;
    loc.maand.totaal += nM; if (isO) loc.maand.open += nM; if (isU) loc.maand.uitg += nM;
    loc.jaar.totaal  += nJ; if (isO) loc.jaar.open  += nJ; if (isU) loc.jaar.uitg  += nJ;
  }

  // Koppel locaties aan klantgroepen
  for (const loc of locatieMap.values()) {
    const { klantgroep } = resolveKlantgroep(loc.werkCode);
    klantgroepMap.get(klantgroep)?.locaties.push(loc);
  }

  // Sorteer locaties per klantgroep op totaal desc
  for (const kg of klantgroepMap.values()) {
    kg.locaties.sort((a, b) => b.all.totaal - a.all.totaal);
  }

  // Sorteer klantgroepen: familie-volgorde, daarna totaal desc
  const FAMILIE_SORT: Record<string, number> = {
    Bestseller: 0, 'AS Watson': 1, CeX: 2,
  };
  const klantgroepen = [...klantgroepMap.values()].sort((a, b) => {
    const fa = a.familie ? FAMILIE_SORT[a.familie] ?? 3 : 3;
    const fb = b.familie ? FAMILIE_SORT[b.familie] ?? 3 : 3;
    if (fa !== fb) return fa - fb;
    return b.all.totaal - a.all.totaal;
  });

  return Response.json({ klantgroepen });
}

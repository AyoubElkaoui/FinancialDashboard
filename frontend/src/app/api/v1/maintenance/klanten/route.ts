/**
 * Klantgroepen Maintenance — gebaseerd op contractcode (AT_WERK.GC_CODE).
 * Alleen 400-reeks werkbonnen (27.072). Niet-400 (284, 1%) uitgesloten.
 *
 * Periode-definitie (besluit Ayoub, 2026-06-03):
 *   "Wk"  = VORIGE kalenderweek (ma–zo)
 *   "Md"  = VORIGE kalendermaand (1e–laatste dag)
 *   "Jaar" = huidig kalenderjaar YTD
 * Datumveld = rm_werkbon.datum = AT_DOCUMENT.GC_BOEKDATUM (bevestigd).
 */
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { resolveKlantgroep } from "@/config/maintenance-klantgroep-mapping";
import type { Familie } from "@/config/maintenance-klantgroep-mapping";

// ── Hulpfuncties ───────────────────────────────────────────────────────────

function open(status: string) { return ["A","I"].includes(status); }
function uitg(status: string) { return ["U","V"].includes(status); }

interface Buckets { open: number; uitg: number; totaal: number; }
const emptyBuckets = (): Buckets => ({ open: 0, uitg: 0, totaal: 0 });

interface LocatieRow {
  klant: string; werkCode: string;
  all: Buckets; week: Buckets; maand: Buckets; jaar: Buckets;
}
interface KlantgroepRow {
  klantgroep: string; familie: Familie;
  all: Buckets; week: Buckets; maand: Buckets; jaar: Buckets;
  locaties: LocatieRow[];
}

// ── Route ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const database = (req.nextUrl.searchParams.get("database") ?? "MAINTENANCE");

  // Bedrijfsstart — data vóór deze datum is leeg/niet relevant
  const BEDRIJF_START = new Date("2026-04-06");

  // Periode-grenzen:
  //   Vorige week: date_trunc('week', today) - 7d  →  date_trunc('week', today)
  //   Vorige maand: date_trunc('month', today) - 1m →  date_trunc('month', today)
  //   Huidig jaar: date_trunc('year', today) → now
  type Row = {
    werk_code: string; klant: string; status: string;
    totaal: string; is_week: string; is_maand: string; is_jaar: string;
  };

  const rows = await db.$queryRaw<Row[]>`
    SELECT
      werk_code,
      COALESCE(klant, '') AS klant,
      status,
      COUNT(*)::text AS totaal,
      SUM(CASE WHEN datum >= date_trunc('week',  CURRENT_DATE) - INTERVAL '7 days'
                AND datum <  date_trunc('week',  CURRENT_DATE)
               THEN 1 ELSE 0 END)::text AS is_week,
      SUM(CASE WHEN datum >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
                AND datum <  date_trunc('month', CURRENT_DATE)
               THEN 1 ELSE 0 END)::text AS is_maand,
      SUM(CASE WHEN datum >= date_trunc('year',  CURRENT_DATE)
               THEN 1 ELSE 0 END)::text AS is_jaar
    FROM rm_werkbon
    WHERE database::text = ${database}
      AND werk_code LIKE '400%'
      AND datum >= ${BEDRIJF_START}
    GROUP BY werk_code, klant, status
    ORDER BY werk_code, klant, status
  `.catch(() => [] as Row[]);

  // Aggregeer per klantgroep & locatie
  const klantgroepMap = new Map<string, KlantgroepRow>();
  const locatieMap    = new Map<string, LocatieRow>();

  for (const r of rows) {
    const n = parseInt(r.totaal), nW = parseInt(r.is_week),
          nM = parseInt(r.is_maand), nJ = parseInt(r.is_jaar);
    const isO = open(r.status), isU = uitg(r.status);
    const { klantgroep, familie } = resolveKlantgroep(r.werk_code);
    const locKey = `${klantgroep}||${r.werk_code}||${r.klant}`;

    if (!klantgroepMap.has(klantgroep)) {
      klantgroepMap.set(klantgroep, {
        klantgroep, familie,
        all: emptyBuckets(), week: emptyBuckets(),
        maand: emptyBuckets(), jaar: emptyBuckets(), locaties: [],
      });
    }
    const kg = klantgroepMap.get(klantgroep)!;
    kg.all.totaal += n;  if (isO) kg.all.open += n;  if (isU) kg.all.uitg += n;
    kg.week.totaal  += nW; if (isO) kg.week.open  += nW; if (isU) kg.week.uitg  += nW;
    kg.maand.totaal += nM; if (isO) kg.maand.open += nM; if (isU) kg.maand.uitg += nM;
    kg.jaar.totaal  += nJ; if (isO) kg.jaar.open  += nJ; if (isU) kg.jaar.uitg  += nJ;

    if (!locatieMap.has(locKey)) {
      locatieMap.set(locKey, {
        klant: r.klant, werkCode: r.werk_code,
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

  for (const loc of locatieMap.values()) {
    const { klantgroep } = resolveKlantgroep(loc.werkCode);
    klantgroepMap.get(klantgroep)?.locaties.push(loc);
  }
  for (const kg of klantgroepMap.values()) {
    kg.locaties.sort((a, b) => b.all.totaal - a.all.totaal);
  }

  const FAMILIE_SORT: Record<string, number> = { Bestseller: 0, 'AS Watson': 1, CeX: 2 };
  const klantgroepen = [...klantgroepMap.values()].sort((a, b) => {
    const fa = a.familie ? FAMILIE_SORT[a.familie] ?? 3 : 3;
    const fb = b.familie ? FAMILIE_SORT[b.familie] ?? 3 : 3;
    return fa !== fb ? fa - fb : b.all.totaal - a.all.totaal;
  });

  return Response.json({ klantgroepen });
}

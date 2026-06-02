import type { FbRubriek, FbJournaalAgg } from "./queries";

// ─── Kosten-whitelist ─────────────────────────────────────────────────────────

/**
 * Expliciete blacklist voor overhead-rubrieken die nooit projectkost zijn.
 * - Viercijerige 5xxx-codes zijn afdelings-/personeelskosten (overhead).
 * - '-' is een ongecategoriseerde vangstrubriek.
 */
const OVERHEAD_EXCLUSIONS = new Set([
  "5514",
  "5561",
  "5574",
]);

/**
 * Enkelvoudige kostendrager-codes (exacte match, niet startsWith).
 * Code '5' ≠ '5569': exact één karakter.
 */
const SINGLE_DIGIT_COST_CODES = new Set([
  "4",    // B-Bouwkundig
  "5",    // (exact code 5 — bevestig nog)
  "6",
  "9",
  // INT-varianten
  "INT4",
  "INT5",
  "INT6",
  "INT9",
]);

/**
 * WIP-mutatie-rubrieken: credit op 8xxx maar géén echte facturomzet.
 * Worden bewust uitgesloten uit de omzetberekening.
 */
const WIP_OMZET_EXCLUSIONS = new Set([
  "8030",  // Mutatie onderhanden projecten
  "8040",  // Mutatie vooruitgefactureerde omzet
  "8045",  // Mutatie nog te factureren omzet
]);

/**
 * Returns true als de rubriekcode een projectkost is.
 * Whitelist-logica:
 *   - Begint met '7' of 'INT7' → altijd kost
 *   - Exact één van de enkelvoudige codes (4/5/6/9/INT4..) → kost
 *   - Staat in OVERHEAD_EXCLUSIONS → nooit kost (overrulet bovenstaande)
 */
function isKostenRubriek(code: string): boolean {
  if (OVERHEAD_EXCLUSIONS.has(code)) return false;
  if (code.startsWith("7") || code.startsWith("INT7")) return true;
  if (SINGLE_DIGIT_COST_CODES.has(code)) return true;
  return false;
}

// ─── Rubriek-maps ─────────────────────────────────────────────────────────────

export interface RubriekMaps {
  byId:         Map<number, FbRubriek>;
  omzetIds:     Set<number>;       // C, W, 8xxx excl. WIP-mutaties
  debiterenIds: Set<number>;       // B, code 1300 (openstaand saldo)
  kostMatIds:   Set<number>;       // D, W, 7000–7008 (materiaalinkoop)
  kostArbIds:   Set<number>;       // D, W, 7009–7055 (directe uren/arbeid)
  kostOvgIds:   Set<number>;       // D, W, overige whitelist-codes
}

export function buildRubriekMaps(rubrieken: FbRubriek[]): RubriekMaps {
  const byId         = new Map<number, FbRubriek>();
  const omzetIds     = new Set<number>();
  const debiterenIds = new Set<number>();
  const kostMatIds   = new Set<number>();
  const kostArbIds   = new Set<number>();
  const kostOvgIds   = new Set<number>();

  for (const r of rubrieken) {
    byId.set(r.GC_ID, r);
    const code = r.GC_CODE.trim();

    // Omzet: credit op W-rubriek 8xxx, excl. WIP-mutaties
    if (
      r.TYPE_RUBRIEK === "W" &&
      (code.startsWith("8") || code.startsWith("INT8")) &&
      !WIP_OMZET_EXCLUSIONS.has(code)
    ) {
      omzetIds.add(r.GC_ID);
    }

    // Debiteuren: balansrubriek 1300
    if (r.TYPE_RUBRIEK === "B" && code === "1300") {
      debiterenIds.add(r.GC_ID);
    }

    // Projectkosten (whitelist)
    if (r.TYPE_RUBRIEK === "W" && isKostenRubriek(code)) {
      if (code >= "7000" && code <= "7008") {
        kostMatIds.add(r.GC_ID);     // Materiaal inkoop
      } else if (code > "7008" && code <= "7055") {
        kostArbIds.add(r.GC_ID);     // Directe uren / arbeid
      } else {
        kostOvgIds.add(r.GC_ID);     // Overige whitelist (7055+, INT7, 4/5/6/9)
      }
    }
  }

  return { byId, omzetIds, debiterenIds, kostMatIds, kostArbIds, kostOvgIds };
}

// ─── Journaal-aggregatie ──────────────────────────────────────────────────────

export interface ProjectAggregaat {
  werkId:        number;
  gefactureerd:  number;
  onbetaald:     number;
  kostenMat:     number;
  kostenArb:     number;
  kostenOvg:     number;
}

export function aggregeerJournaal(
  rows:  FbJournaalAgg[],
  maps:  RubriekMaps
): Map<number, ProjectAggregaat> {
  const result = new Map<number, ProjectAggregaat>();

  const get = (werkId: number): ProjectAggregaat => {
    if (!result.has(werkId)) {
      result.set(werkId, {
        werkId, gefactureerd: 0, onbetaald: 0, kostenMat: 0, kostenArb: 0, kostenOvg: 0,
      });
    }
    return result.get(werkId)!;
  };

  for (const row of rows) {
    const agg    = get(row.WERK_GC_ID);
    const bedrag = round2(row.BEDRAG_SOM);

    if (row.DEBET_CREDIT === "C" && maps.omzetIds.has(row.RUBRIEK_GC_ID)) {
      agg.gefactureerd += bedrag;
    }

    if (maps.debiterenIds.has(row.RUBRIEK_GC_ID)) {
      // Debiteuren-saldo: C verhoogt openstaand, D verlaagt (ontvangsten)
      agg.onbetaald += row.DEBET_CREDIT === "C" ? bedrag : -bedrag;
    }

    if (row.DEBET_CREDIT === "D") {
      if      (maps.kostMatIds.has(row.RUBRIEK_GC_ID)) agg.kostenMat += bedrag;
      else if (maps.kostArbIds.has(row.RUBRIEK_GC_ID)) agg.kostenArb += bedrag;
      else if (maps.kostOvgIds.has(row.RUBRIEK_GC_ID)) agg.kostenOvg += bedrag;
    }
  }

  return result;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

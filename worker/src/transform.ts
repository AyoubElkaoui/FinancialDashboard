import type { FbRubriek, FbJournaalAgg } from "./queries";

export interface RubriekMaps {
  byId: Map<number, FbRubriek>;
  omzetIds: Set<number>;      // C, W, code 8xxx / INT8xxx
  debiterenIds: Set<number>;  // B, code 1300 (openstaand)
  kostMatIds: Set<number>;    // D, W, code 7000–7008 (materiaal)
  kostArbIds: Set<number>;    // D, W, code 7010–7055 (arbeid/uren)
  kostOvgIds: Set<number>;    // D, W, overige 7xxx
}

export function buildRubriekMaps(rubrieken: FbRubriek[]): RubriekMaps {
  const byId = new Map<number, FbRubriek>();
  const omzetIds    = new Set<number>();
  const debiterenIds = new Set<number>();
  const kostMatIds  = new Set<number>();
  const kostArbIds  = new Set<number>();
  const kostOvgIds  = new Set<number>();

  for (const r of rubrieken) {
    byId.set(r.GC_ID, r);
    const code = r.GC_CODE.trim();

    if (r.TYPE_RUBRIEK === "W" && (code.startsWith("8") || code.startsWith("INT8"))) {
      omzetIds.add(r.GC_ID);
    }

    if (r.TYPE_RUBRIEK === "B" && code === "1300") {
      debiterenIds.add(r.GC_ID);
    }

    if (r.TYPE_RUBRIEK === "W") {
      if (code >= "7000" && code <= "7008") {
        kostMatIds.add(r.GC_ID);
      } else if (code >= "7009" && code <= "7055") {
        kostArbIds.add(r.GC_ID);
      } else if (code.startsWith("7") || code.startsWith("INT7")) {
        kostOvgIds.add(r.GC_ID);
      }
    }
  }

  return { byId, omzetIds, debiterenIds, kostMatIds, kostArbIds, kostOvgIds };
}

export interface ProjectAggregaat {
  werkId: number;
  gefactureerd: number;   // som C/W/8xxx
  onbetaald: number;      // journaalsaldo rubriek 1300
  kostenMat: number;      // som D/W/7000-7008
  kostenArb: number;      // som D/W/7009-7055
  kostenOvg: number;      // som D/W overige 7xxx
}

export function aggregeerJournaal(
  rows: FbJournaalAgg[],
  maps: RubriekMaps
): Map<number, ProjectAggregaat> {
  const result = new Map<number, ProjectAggregaat>();

  const get = (werkId: number): ProjectAggregaat => {
    if (!result.has(werkId)) {
      result.set(werkId, { werkId, gefactureerd: 0, onbetaald: 0, kostenMat: 0, kostenArb: 0, kostenOvg: 0 });
    }
    return result.get(werkId)!;
  };

  for (const row of rows) {
    const agg = get(row.WERK_GC_ID);
    const bedrag = round2(Number(row.BEDRAG_SOM));

    if (row.DEBET_CREDIT === "C" && maps.omzetIds.has(row.RUBRIEK_GC_ID)) {
      agg.gefactureerd += bedrag;
    }
    if (maps.debiterenIds.has(row.RUBRIEK_GC_ID)) {
      // Saldo: D vermindert onbetaald, C vergroot het
      agg.onbetaald += row.DEBET_CREDIT === "C" ? bedrag : -bedrag;
    }
    if (row.DEBET_CREDIT === "D") {
      if (maps.kostMatIds.has(row.RUBRIEK_GC_ID))  agg.kostenMat += bedrag;
      else if (maps.kostArbIds.has(row.RUBRIEK_GC_ID)) agg.kostenArb += bedrag;
      else if (maps.kostOvgIds.has(row.RUBRIEK_GC_ID)) agg.kostenOvg += bedrag;
    }
  }

  return result;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

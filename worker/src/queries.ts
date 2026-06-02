import { fbQuery } from "./firebird";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FbRubriek {
  GC_ID: number;
  GC_CODE: string;
  GC_OMSCHRIJVING: string;
  TYPE_RUBRIEK: string; // W = winst/verlies, B = balans
}

export interface FbWerk {
  GC_ID: number;
  GC_CODE: string;            // Projectnummer, bv. "300-26-009"
  GC_OMSCHRIJVING: string;    // Projectnaam
  OPD_RELATIE_GC_ID: number | null;
}

export interface FbRelatie {
  GC_ID: number;
  GC_OMSCHRIJVING: string;
}

export interface FbJournaalAgg {
  WERK_GC_ID: number;
  RUBRIEK_GC_ID: number;
  DEBET_CREDIT: string;       // D of C
  BEDRAG_SOM: number;
}

export interface FbJournaalDetail {
  WERK_GC_ID: number;
  DATUM: Date;
  RUBRIEK_CODE: string;
  RUBRIEK_OMSCHR: string;
  TYPE_RUBRIEK: string;
  DEBET_CREDIT: string;
  BEDRAG: number;
  OMSCHRIJVING: string | null;
}

export interface FbOrderAgg {
  WERK_GC_ID: number;
  AANNEEMSOM: number;
  METH_BEREKENING: string | null;  // Voor BTW-verificatie
  BTW_VERREKENING: string | null;
}

export interface FbUrenAgg {
  WERK_GC_ID: number;
  UREN_TOTAAL: number;
}

export interface FbUrenDetail {
  WERK_GC_ID: number;
  MEDEWERKER: string;
  DATUM: Date;
  AANTAL: number;
  OMSCHRIJVING: string | null;
}

// ─── Query functies ───────────────────────────────────────────────────────────

/** Alle rubriek codes + types — voor categorisatie van kosten/omzet. */
export function fetchRubrieken(): Promise<FbRubriek[]> {
  return fbQuery<FbRubriek>(`
    SELECT GC_ID, GC_CODE, GC_OMSCHRIJVING, TYPE_RUBRIEK
    FROM AT_RUBRIEK
    WHERE TYPE_RUBRIEK IN ('W', 'B')
      AND GC_CODE IS NOT NULL
    ORDER BY GC_CODE
  `);
}

/** Alle projecten voor een administratie. */
export function fetchProjecten(adminId: number): Promise<FbWerk[]> {
  return fbQuery<FbWerk>(`
    SELECT GC_ID, GC_CODE, GC_OMSCHRIJVING, OPD_RELATIE_GC_ID
    FROM AT_WERK
    WHERE ADMINIS_GC_ID = ?
      AND GC_CODE IS NOT NULL
    ORDER BY GC_CODE
  `, [adminId]);
}

/** Klantnamen voor een administratie. */
export function fetchRelaties(adminId: number): Promise<FbRelatie[]> {
  return fbQuery<FbRelatie>(`
    SELECT DISTINCT r.GC_ID, r.GC_OMSCHRIJVING
    FROM AT_RELATIE r
    WHERE r.GC_ID IN (
      SELECT DISTINCT OPD_RELATIE_GC_ID
      FROM AT_WERK
      WHERE ADMINIS_GC_ID = ?
        AND OPD_RELATIE_GC_ID IS NOT NULL
    )
  `, [adminId]);
}

/**
 * Aanneemsom per project (som van AT_ORDER.BEDRAG_TOTAAL).
 *
 * LETOP BTW: verifieer via validate.ts of BEDRAG_TOTAAL incl. of excl. BTW is
 * door METH_BEREKENING/BTW_VERREKENING te inspecteren vóór productiegebruik.
 */
export function fetchOrderAgg(adminId: number): Promise<FbOrderAgg[]> {
  return fbQuery<FbOrderAgg>(`
    SELECT
      o.WERK_GC_ID,
      SUM(o.BEDRAG_TOTAAL) AS AANNEEMSOM,
      MAX(o.METH_BEREKENING) AS METH_BEREKENING,
      MAX(o.BTW_VERREKENING) AS BTW_VERREKENING
    FROM AT_ORDER o
    WHERE o.WERK_GC_ID IN (
      SELECT GC_ID FROM AT_WERK WHERE ADMINIS_GC_ID = ?
    )
      AND o.WERK_GC_ID IS NOT NULL
    GROUP BY o.WERK_GC_ID
  `, [adminId]);
}

/**
 * Journaal-aggregaten per project × rubriek × D/C.
 * Worden in Node.js gecategoriseerd via de rubriek-map.
 */
export function fetchJournaalAgg(adminId: number): Promise<FbJournaalAgg[]> {
  return fbQuery<FbJournaalAgg>(`
    SELECT
      j.WERK_GC_ID,
      j.RUBRIEK_GC_ID,
      j.DEBET_CREDIT,
      SUM(j.BEDRAG) AS BEDRAG_SOM
    FROM AT_JOURNAAL j
    WHERE j.WERK_GC_ID IN (
      SELECT GC_ID FROM AT_WERK WHERE ADMINIS_GC_ID = ?
    )
      AND j.WERK_GC_ID IS NOT NULL
      AND j.WERK_GC_ID <> 0
    GROUP BY j.WERK_GC_ID, j.RUBRIEK_GC_ID, j.DEBET_CREDIT
  `, [adminId]);
}

/**
 * Journaaldetails voor rm_journaal (grootboek-pagina).
 * Alleen W- en B-rubrieken, meest recente jaar.
 */
export function fetchJournaalDetail(adminId: number): Promise<FbJournaalDetail[]> {
  return fbQuery<FbJournaalDetail>(`
    SELECT
      j.WERK_GC_ID,
      j.DATUM,
      r.GC_CODE       AS RUBRIEK_CODE,
      r.GC_OMSCHRIJVING AS RUBRIEK_OMSCHR,
      r.TYPE_RUBRIEK,
      j.DEBET_CREDIT,
      j.BEDRAG,
      j.OMSCHRIJVING
    FROM AT_JOURNAAL j
    JOIN AT_RUBRIEK r ON r.GC_ID = j.RUBRIEK_GC_ID
    WHERE j.WERK_GC_ID IN (
      SELECT GC_ID FROM AT_WERK WHERE ADMINIS_GC_ID = ?
    )
      AND j.WERK_GC_ID IS NOT NULL
      AND j.WERK_GC_ID <> 0
      AND r.TYPE_RUBRIEK IN ('W', 'B')
      AND j.DATUM >= CURRENT_DATE - 365
    ORDER BY j.DATUM DESC
  `, [adminId]);
}

/** Uren-totalen per project. */
export function fetchUrenAgg(adminId: number): Promise<FbUrenAgg[]> {
  return fbQuery<FbUrenAgg>(`
    SELECT
      u.WERK_GC_ID,
      SUM(u.AANTAL) AS UREN_TOTAAL
    FROM AT_URENBREG u
    WHERE u.WERK_GC_ID IN (
      SELECT GC_ID FROM AT_WERK WHERE ADMINIS_GC_ID = ?
    )
      AND u.WERK_GC_ID IS NOT NULL
    GROUP BY u.WERK_GC_ID
  `, [adminId]);
}

/** Uren-details per medewerker/dag voor rm_uren. */
export function fetchUrenDetail(adminId: number): Promise<FbUrenDetail[]> {
  return fbQuery<FbUrenDetail>(`
    SELECT
      u.WERK_GC_ID,
      COALESCE(m.GC_OMSCHRIJVING, 'Onbekend') AS MEDEWERKER,
      u.DATUM,
      u.AANTAL,
      u.OMSCHRIJVING
    FROM AT_URENBREG u
    LEFT JOIN AT_MEDEW m ON m.GC_ID = u.MEDEW_GC_ID
    WHERE u.WERK_GC_ID IN (
      SELECT GC_ID FROM AT_WERK WHERE ADMINIS_GC_ID = ?
    )
      AND u.WERK_GC_ID IS NOT NULL
      AND u.DATUM >= CURRENT_DATE - 365
    ORDER BY u.DATUM DESC
  `, [adminId]);
}

/**
 * Alle Firebird-queries voor de sync-worker.
 *
 * Waarden komen als strings terug van isql; numerieke velden worden
 * expliciet geconverteerd in elke fetchXxx-functie.
 *
 * SQL-parameters worden inline geïnjecteerd (adminId is altijd een
 * hardcoded integer uit config, nooit user input → geen injectierisico).
 */

import { fbQuery } from "./firebird";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface FbRubriek {
  GC_ID:           number;
  GC_CODE:         string;
  GC_OMSCHRIJVING: string;
  TYPE_RUBRIEK:    string;   // W = winst/verlies, B = balans
}

export interface FbWerk {
  GC_ID:              number;
  GC_CODE:            string;
  GC_OMSCHRIJVING:    string;
  OPD_RELATIE_GC_ID:  number | null;
}

export interface FbRelatie {
  GC_ID:           number;
  GC_OMSCHRIJVING: string;
}

export interface FbJournaalAgg {
  WERK_GC_ID:    number;
  RUBRIEK_GC_ID: number;
  DEBET_CREDIT:  string;
  BEDRAG_SOM:    number;
}

export interface FbJournaalDetail {
  WERK_GC_ID:    number;
  DATUM:         string;    // 'YYYY-MM-DD' na CAST
  RUBRIEK_CODE:  string;
  RUBRIEK_OMSCHR: string;
  TYPE_RUBRIEK:  string;
  DEBET_CREDIT:  string;
  BEDRAG:        number;
  OMSCHRIJVING:  string | null;
}

export interface FbOrderAgg {
  WERK_GC_ID:     number;
  AANNEEMSOM:     number;
  BTW_VERREKENING: string | null;
}

export interface FbUrenAgg {
  WERK_GC_ID:  number;
  UREN_TOTAAL: number;
}

export interface FbUrenDetail {
  WERK_GC_ID:  number;
  MEDEWERKER:  string;
  DATUM:       string;
  AANTAL:      number;
  OMSCHRIJVING: string | null;
}

// ─── Hulpfuncties ──────────────────────────────────────────────────────────────

const toInt  = (s: string) => parseInt(s || "0", 10);
const toNum  = (s: string) => parseFloat(s.replace(",", ".") || "0");
const toNull = (s: string): string | null => s.trim() === "" ? null : s.trim();

// ─── Query functies ─────────────────────────────────────────────────────────────

/** Alle rubriek-codes inclusief type (W/B). */
export function fetchRubrieken(): FbRubriek[] {
  const rows = fbQuery(`
    SELECT GC_ID, GC_CODE, GC_OMSCHRIJVING, TYPE_RUBRIEK
    FROM AT_RUBRIEK
    WHERE TYPE_RUBRIEK IN ('W', 'B')
      AND GC_CODE IS NOT NULL
    ORDER BY GC_CODE;
  `);
  return rows
    .filter(r => r.GC_ID && r.GC_CODE)
    .map(r => ({
      GC_ID:           toInt(r.GC_ID),
      GC_CODE:         (r.GC_CODE ?? "").trim(),
      GC_OMSCHRIJVING: (r.GC_OMSCHRIJVING ?? "").trim(),
      TYPE_RUBRIEK:    (r.TYPE_RUBRIEK ?? "").trim(),
    }));
}

/** Alle projecten (AT_WERK) voor één administratie. */
export function fetchProjecten(adminId: number): FbWerk[] {
  const rows = fbQuery(`
    SELECT GC_ID, GC_CODE, GC_OMSCHRIJVING, OPD_RELATIE_GC_ID
    FROM AT_WERK
    WHERE ADMINIS_GC_ID = ${adminId}
      AND GC_CODE IS NOT NULL
    ORDER BY GC_CODE;
  `);
  return rows.map(r => ({
    GC_ID:             toInt(r.GC_ID),
    GC_CODE:           r.GC_CODE.trim(),
    GC_OMSCHRIJVING:   r.GC_OMSCHRIJVING.trim(),
    OPD_RELATIE_GC_ID: r.OPD_RELATIE_GC_ID ? toInt(r.OPD_RELATIE_GC_ID) : null,
  }));
}

/** Klantnamen die bij de projecten van deze administratie horen. */
export function fetchRelaties(adminId: number): FbRelatie[] {
  const rows = fbQuery(`
    SELECT DISTINCT r.GC_ID, r.GC_OMSCHRIJVING
    FROM AT_RELATIE r
    WHERE r.GC_ID IN (
      SELECT DISTINCT OPD_RELATIE_GC_ID
      FROM AT_WERK
      WHERE ADMINIS_GC_ID = ${adminId}
        AND OPD_RELATIE_GC_ID IS NOT NULL
    )
    ORDER BY r.GC_ID;
  `);
  return rows.map(r => ({
    GC_ID:           toInt(r.GC_ID),
    GC_OMSCHRIJVING: r.GC_OMSCHRIJVING.trim(),
  }));
}

/**
 * Aanneemsom per project (som AT_ORDER.BEDRAG_TOTAAL, excl. BTW bevestigd).
 * METH_BEREKENING en BTW_VERREKENING worden meegeleverd voor auditabiliteit.
 */
export function fetchOrderAgg(adminId: number): FbOrderAgg[] {
  const rows = fbQuery(`
    SELECT
      o.WERK_GC_ID,
      SUM(o.BEDRAG_TOTAAL)    AS AANNEEMSOM,
      MAX(o.BTW_VERREKENING)  AS BTW_VERREKENING
    FROM AT_ORDER o
    WHERE o.WERK_GC_ID IN (
      SELECT GC_ID FROM AT_WERK WHERE ADMINIS_GC_ID = ${adminId}
    )
      AND o.WERK_GC_ID IS NOT NULL
    GROUP BY o.WERK_GC_ID
    ORDER BY o.WERK_GC_ID;
  `);
  return rows.map(r => ({
    WERK_GC_ID:      toInt(r.WERK_GC_ID),
    AANNEEMSOM:      toNum(r.AANNEEMSOM),
    BTW_VERREKENING: toNull(r.BTW_VERREKENING ?? ""),
  }));
}

/**
 * Journaal-aggregaten per (project, rubriek, D/C).
 *
 * Geen code-filter hier — de categorisatie (omzet/kosten/debiteur)
 * gebeurt in transform.ts via de rubriek-whitelist.
 * WIP-mutaties (8030/8040/8045) worden gefilterd in buildRubriekMaps.
 */
export function fetchJournaalAgg(adminId: number): FbJournaalAgg[] {
  const rows = fbQuery(`
    SELECT
      j.WERK_GC_ID,
      j.RUBRIEK_GC_ID,
      j.DEBET_CREDIT,
      SUM(j.BEDRAG) AS BEDRAG_SOM
    FROM AT_JOURNAAL j
    WHERE j.WERK_GC_ID IN (
      SELECT GC_ID FROM AT_WERK WHERE ADMINIS_GC_ID = ${adminId}
    )
      AND j.WERK_GC_ID IS NOT NULL
      AND j.WERK_GC_ID <> 0
    GROUP BY j.WERK_GC_ID, j.RUBRIEK_GC_ID, j.DEBET_CREDIT
    ORDER BY j.WERK_GC_ID;
  `);
  return rows.map(r => ({
    WERK_GC_ID:    toInt(r.WERK_GC_ID),
    RUBRIEK_GC_ID: toInt(r.RUBRIEK_GC_ID),
    DEBET_CREDIT:  r.DEBET_CREDIT.trim(),
    BEDRAG_SOM:    toNum(r.BEDRAG_SOM),
  }));
}

/** Journaaldetails voor rm_journaal (grootboek-pagina), laatste 365 dagen. */
export function fetchJournaalDetail(adminId: number): FbJournaalDetail[] {
  const rows = fbQuery(`
    SELECT
      j.WERK_GC_ID,
      CAST(CAST(s.DOORBOEKDATUM AS DATE) AS VARCHAR(10)) AS DATUM,
      r.GC_CODE                                          AS RUBRIEK_CODE,
      r.GC_OMSCHRIJVING                                  AS RUBRIEK_OMSCHR,
      r.TYPE_RUBRIEK,
      j.DEBET_CREDIT,
      j.BEDRAG,
      j.GC_OMSCHRIJVING                                  AS OMSCHRIJVING
    FROM AT_JOURNAAL j
    JOIN AT_RUBRIEK r ON r.GC_ID = j.RUBRIEK_GC_ID
    JOIN AT_SESSIE s   ON s.GC_ID = j.SESSIE_GC_ID
    WHERE j.WERK_GC_ID IN (
      SELECT GC_ID FROM AT_WERK WHERE ADMINIS_GC_ID = ${adminId}
    )
      AND j.WERK_GC_ID IS NOT NULL
      AND j.WERK_GC_ID <> 0
      AND r.TYPE_RUBRIEK IN ('W', 'B')
      AND CAST(s.DOORBOEKDATUM AS DATE) >= CURRENT_DATE - 365
    ORDER BY s.DOORBOEKDATUM DESC;
  `);
  return rows
    .filter(r => r.WERK_GC_ID && r.RUBRIEK_CODE && r.DEBET_CREDIT)
    .map(r => ({
      WERK_GC_ID:    toInt(r.WERK_GC_ID),
      DATUM:         (r.DATUM ?? "").trim(),
      RUBRIEK_CODE:  (r.RUBRIEK_CODE ?? "").trim(),
      RUBRIEK_OMSCHR: (r.RUBRIEK_OMSCHR ?? "").trim(),
      TYPE_RUBRIEK:  (r.TYPE_RUBRIEK ?? "").trim(),
      DEBET_CREDIT:  (r.DEBET_CREDIT ?? "").trim(),
      BEDRAG:        toNum(r.BEDRAG ?? "0"),
      OMSCHRIJVING:  toNull(r.OMSCHRIJVING ?? ""),
    }));
}

/** Uren-totalen per project. */
export function fetchUrenAgg(adminId: number): FbUrenAgg[] {
  const rows = fbQuery(`
    SELECT
      u.WERK_GC_ID,
      SUM(u.AANTAL) AS UREN_TOTAAL
    FROM AT_URENBREG u
    WHERE u.WERK_GC_ID IN (
      SELECT GC_ID FROM AT_WERK WHERE ADMINIS_GC_ID = ${adminId}
    )
      AND u.WERK_GC_ID IS NOT NULL
    GROUP BY u.WERK_GC_ID
    ORDER BY u.WERK_GC_ID;
  `);
  return rows.map(r => ({
    WERK_GC_ID:  toInt(r.WERK_GC_ID),
    UREN_TOTAAL: toNum(r.UREN_TOTAAL),
  }));
}

// ─── Werkbon queries (Maintenance) ────────────────────────────────────────────

export interface FbWerkbon {
  BONNUMMER:          string;
  DATUM:              string;
  OMSCHRIJVING:       string | null;
  STATUS:             string;
  METH_IN_UITVOERING: string | null;
  FASE:               string | null;
  KLANT:              string | null;
  EIGENAAR:           string | null;
  WERK_CODE:          string | null;
  IS_GEFACTUREERD:    string;
  OPBRENGSTEN:        number;      // AT_KLNTBREG sum per bon (100% dekking)
  WERK_GC_ID_RAW:     string | null;
  TAAK_CODE:          string | null; // AT_TAAK.GC_CODE -> techniek W/E/CV/B
  UREN_WERKBON:       number | null;
  UREN_CONTRACT:      number | null;
}

/**
 * Alle werkbonnen voor de Maintenance-DB.
 * Joins: AT_DOCUMENT (datum/nummer/eigenaar), AT_RELATIE (klant),
 * AT_WBADFASE (fase), AT_MEDEW (eigenaar naam), AT_WERK (contractcode).
 *
 * IS_GEFACTUREERD: true als minstens één KLNTBREG-regel met GC_BEDRAG > 0
 * een GC_GEFACTUREERD (factuurverwijzing) heeft.
 */
export function fetchWerkbonnen(fbDatabase: string): FbWerkbon[] {
  // Query 1: basis werkbon-data (zonder EXISTS subquery — te complex voor isql)
  const rows = fbQuery(`
    SELECT d.GC_CODE AS BONNUMMER,
      CAST(CAST(d.GC_BOEKDATUM AS DATE) AS VARCHAR(10)) AS DATUM,
      SUBSTRING(d.GC_OMSCHRIJVING FROM 1 FOR 120) AS OMSCHRIJVING,
      TRIM(wb.STATUS) AS STATUS,
      TRIM(wb.METH_IN_UITVOERING) AS METH_IN_UITVOERING,
      SUBSTRING(COALESCE(f.GC_OMSCHRIJVING,'') FROM 1 FOR 80) AS FASE,
      SUBSTRING(COALESCE(r.GC_OMSCHRIJVING,'') FROM 1 FOR 100) AS KLANT,
      SUBSTRING(COALESCE(m.GC_OMSCHRIJVING,'') FROM 1 FOR 60) AS EIGENAAR,
      COALESCE(w.GC_CODE,'') AS WERK_CODE,
      COALESCE(CAST(wb.WERK_GC_ID AS VARCHAR(15)),'') AS WERK_GC_ID_RAW,
      COALESCE(t.GC_CODE,'') AS TAAK_CODE
    FROM AT_WERKBON wb
    JOIN AT_DOCUMENT d ON d.GC_ID = wb.DOCUMENT_GC_ID
    LEFT JOIN AT_RELATIE r ON r.GC_ID = wb.RELATIE_GC_ID
    LEFT JOIN AT_MEDEW m ON m.GC_ID = d.EIG_MEDEW_GC_ID
    LEFT JOIN AT_WBADFASE f ON f.GC_ID = wb.WBADFASE_GC_ID
    LEFT JOIN AT_WERK w ON w.GC_ID = wb.WERK_GC_ID
    LEFT JOIN AT_TAAK t ON t.GC_ID = wb.TAAK_GC_ID
    ORDER BY d.GC_BOEKDATUM DESC;
  `, fbDatabase);

  // Query 2: opbrengsten per bon (AT_KLNTBREG, 100% dekking)
  const opbrRow = fbQuery<{ BONNUMMER: string; OPBRENGST: string }>(
    `SELECT d.GC_CODE AS BONNUMMER, SUM(kb.GC_BEDRAG) AS OPBRENGST
     FROM AT_KLNTBREG kb
     JOIN AT_DOCUMENT d ON d.GC_ID = kb.WERKBON_GC_ID
     WHERE kb.GC_BEDRAG > 0
     GROUP BY d.GC_CODE;`,
    fbDatabase
  );
  const opbrMap = new Map(opbrRow.map(r => [r.BONNUMMER?.trim() ?? "", parseFloat(r.OPBRENGST ?? "0") || 0]));

  // Query 3: welke bonnummers zijn gefactureerd?
  const factRows = fbQuery<{ BONNUMMER: string }>(
    `SELECT DISTINCT d.GC_CODE AS BONNUMMER
     FROM AT_KLNTBREG kb
     JOIN AT_DOCUMENT d ON d.GC_ID = kb.WERKBON_GC_ID
     WHERE kb.GC_GEFACTUREERD IS NOT NULL AND kb.GC_BEDRAG > 0;`,
    fbDatabase
  );
  const gefactureerdSet = new Set(factRows.map(r => r.BONNUMMER?.trim() ?? ""));

  // Query 4a: uren per bon (AT_URENBREG.WERKBON_GC_ID, 23% dekking)
  const urenRow = fbQuery<{ BONNUMMER: string; UREN: string }>(
    `SELECT d.GC_CODE AS BONNUMMER, SUM(u.AANTAL) AS UREN
     FROM AT_URENBREG u
     JOIN AT_DOCUMENT d ON d.GC_ID = u.WERKBON_GC_ID
     WHERE u.WERKBON_GC_ID IS NOT NULL
     GROUP BY d.GC_CODE;`,
    fbDatabase
  );
  const urenMap = new Map(urenRow.map(r => [r.BONNUMMER?.trim() ?? "", parseFloat(r.UREN ?? "0") || 0]));

  // Query 4b: uren per WERK/contract (77% van de uren — niet bon-specifiek)
  // Geeft het TOTAAL uren voor het hele contract, niet per individuele bon.
  const urenWerkRow = fbQuery<{ WERK_GC_ID: string; UREN: string }>(
    `SELECT u.WERK_GC_ID, SUM(u.AANTAL) AS UREN
     FROM AT_URENBREG u
     WHERE u.WERKBON_GC_ID IS NULL AND u.WERK_GC_ID IS NOT NULL
     GROUP BY u.WERK_GC_ID;`,
    fbDatabase
  );
  const urenWerkMap = new Map(urenWerkRow.map(r => [r.WERK_GC_ID?.trim() ?? "", parseFloat(r.UREN ?? "0") || 0]));

  return rows.map(r => {
    const bon = r.BONNUMMER?.trim() ?? "";
    return {
      BONNUMMER:          bon,
      DATUM:              r.DATUM?.trim() ?? "",
      OMSCHRIJVING:       r.OMSCHRIJVING?.trim() || null,
      STATUS:             r.STATUS?.trim() ?? "",
      METH_IN_UITVOERING: r.METH_IN_UITVOERING?.trim() || null,
      FASE:               r.FASE?.trim() || null,
      KLANT:              r.KLANT?.trim() || null,
      EIGENAAR:           r.EIGENAAR?.trim() || null,
      WERK_CODE:          r.WERK_CODE?.trim() || null,
      IS_GEFACTUREERD:    gefactureerdSet.has(bon) ? "1" : "0",
      OPBRENGSTEN:        opbrMap.get(bon) ?? 0,
      WERK_GC_ID_RAW:     r.WERK_GC_ID_RAW?.trim() || null,
      TAAK_CODE:          r.TAAK_CODE?.trim() || null,
      UREN_WERKBON:       urenMap.get(bon) ?? null,
      UREN_CONTRACT:      r.WERK_GC_ID_RAW?.trim() ? (urenWerkMap.get(r.WERK_GC_ID_RAW.trim()) ?? null) : null,
    };
  });
}

// ─── Maintenance journaal-omzet (AT_JOURNAAL + AT_VERKFACT) ──────────────────

export interface FbMaintOmzetRegel {
  CONTRACT_CODE: string;
  DATUM:         string;   // YYYY-MM-DD (vf.DATUM_FACT)
  RUBRIEK_CODE:  string;   // '8020' of '8300'
  RUBRIEK_OMSCHR: string;
  BEDRAG:        number;
}

/**
 * Omzet uit verkoopfacturen voor Maintenance (AT_JOURNAAL + AT_VERKFACT).
 * Alleen rubrieken 8020 (Periodiek) en 8300 (Service), creditzijde.
 * Datumveld = vf.DATUM_FACT (factuurdatum, geverifieerd).
 */
export function fetchJournaalMaintenance(fbDatabase: string): FbMaintOmzetRegel[] {
  const rows = fbQuery(`
    SELECT
      w.GC_CODE AS CONTRACT_CODE,
      CAST(CAST(vf.DATUM_FACT AS DATE) AS VARCHAR(10)) AS DATUM,
      r.GC_CODE AS RUBRIEK_CODE,
      SUBSTRING(r.GC_OMSCHRIJVING FROM 1 FOR 80) AS RUBRIEK_OMSCHR,
      j.BEDRAG AS BEDRAG
    FROM AT_JOURNAAL j
    JOIN AT_VERKFACT vf ON vf.DOCUMENT_GC_ID = j.DOCUMENT_GC_ID
    JOIN AT_WERK     w  ON w.GC_ID = j.WERK_GC_ID
    JOIN AT_RUBRIEK  r  ON r.GC_ID = j.RUBRIEK_GC_ID
    WHERE j.DEBET_CREDIT = 'C'
      AND w.GC_CODE STARTING WITH '400'
      AND r.GC_CODE IN ('8020','8300')
    ORDER BY vf.DATUM_FACT DESC;
  `, fbDatabase);

  return rows
    .filter(r => r.CONTRACT_CODE && r.DATUM && r.RUBRIEK_CODE)
    .map(r => ({
      CONTRACT_CODE:  r.CONTRACT_CODE.trim(),
      DATUM:          r.DATUM.trim(),
      RUBRIEK_CODE:   r.RUBRIEK_CODE.trim(),
      RUBRIEK_OMSCHR: r.RUBRIEK_OMSCHR?.trim() ?? "",
      BEDRAG:         parseFloat(r.BEDRAG ?? "0") || 0,
    }));
}

/**
 * Totale company-level debiteuren: netto-saldo rubriek 1300.
 * AT_JOURNAAL.WERK_GC_ID = NULL voor debiteurenadministratie —
 * niet project-gebonden, dus geen WERK_GC_ID-filter.
 * Scoping via administratie-DB (Services = apart .FDB bestand).
 */
export function fetchDebiteuren(fbDatabase?: string): number {
  const rows = fbQuery<{ NETTO: string }>(`
    SELECT SUM(
      CASE j.DEBET_CREDIT
        WHEN 'D' THEN  j.BEDRAG
        WHEN 'C' THEN -j.BEDRAG
        ELSE 0
      END
    ) AS NETTO
    FROM AT_JOURNAAL j
    JOIN AT_RUBRIEK r ON r.GC_ID = j.RUBRIEK_GC_ID
    WHERE r.GC_CODE = '1300'
      AND r.TYPE_RUBRIEK = 'B';
  `, fbDatabase);
  return Math.max(0, parseFloat(rows[0]?.NETTO ?? "0") || 0);
}

/** Uren-details per medewerker/dag (rm_uren), laatste 365 dagen. */
export function fetchUrenDetail(adminId: number): FbUrenDetail[] {
  const rows = fbQuery(`
    SELECT
      u.WERK_GC_ID,
      COALESCE(m.GC_OMSCHRIJVING, 'Onbekend')  AS MEDEWERKER,
      CAST(CAST(u.DATUM AS DATE) AS VARCHAR(10)) AS DATUM,
      u.AANTAL,
      u.GC_OMSCHRIJVING                         AS OMSCHRIJVING
    FROM AT_URENBREG u
    LEFT JOIN AT_MEDEW m ON m.GC_ID = u.MEDEW_GC_ID
    WHERE u.WERK_GC_ID IN (
      SELECT GC_ID FROM AT_WERK WHERE ADMINIS_GC_ID = ${adminId}
    )
      AND u.WERK_GC_ID IS NOT NULL
      AND CAST(u.DATUM AS DATE) >= CURRENT_DATE - 365
    ORDER BY u.DATUM DESC;
  `);
  return rows
    .filter(r => r.WERK_GC_ID && r.DATUM && r.AANTAL)
    .map(r => ({
      WERK_GC_ID:  toInt(r.WERK_GC_ID),
      MEDEWERKER:  (r.MEDEWERKER ?? "Onbekend").trim(),
      DATUM:       (r.DATUM ?? "").trim(),
      AANTAL:      toNum(r.AANTAL ?? "0"),
      OMSCHRIJVING: toNull(r.OMSCHRIJVING ?? ""),
    }));
}

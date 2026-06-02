/**
 * validate.ts — Draai dit script vóór de eerste sync.
 * Vergelijk de uitvoer met bekende waarden uit Syntess Atrium.
 *
 * Gebruik: ts-node src/validate.ts [adminId]
 * Standaard adminId = 1 (Services)
 */

import dotenv from "dotenv";
dotenv.config();

import { fbQuery } from "./firebird";
import { testFirebird } from "./firebird";

const ADMIN_ID = Number(process.argv[2] ?? 1);
const SEP = "─".repeat(70);

async function main() {
  console.log(SEP);
  console.log(`SYNTESS ATRIUM VALIDATIE — adminId=${ADMIN_ID}`);
  console.log(SEP);

  // 1. Verbinding testen
  console.log("\n[1/5] Firebird verbinding testen...");
  await testFirebird();
  console.log("      ✓ Verbinding OK\n");

  // 2. Rubriek codes
  console.log("[2/5] Rubriek codes (eerste 20):");
  const rubrieken = await fbQuery<{ GC_CODE: string; GC_OMSCHRIJVING: string; TYPE_RUBRIEK: string }>(`
    SELECT FIRST 20 GC_CODE, GC_OMSCHRIJVING, TYPE_RUBRIEK
    FROM AT_RUBRIEK
    WHERE TYPE_RUBRIEK IN ('W', 'B')
      AND (GC_CODE STARTING WITH '7' OR GC_CODE STARTING WITH '8'
           OR GC_CODE STARTING WITH 'INT7' OR GC_CODE STARTING WITH 'INT8'
           OR GC_CODE = '1300')
    ORDER BY GC_CODE
  `);
  console.table(rubrieken.map(r => ({ code: r.GC_CODE, omschr: r.GC_OMSCHRIJVING.substring(0,40), type: r.TYPE_RUBRIEK })));

  // 3. Aanneemsom BTW check
  console.log("\n[3/5] AT_ORDER — BTW-status (METH_BEREKENING / BTW_VERREKENING):");
  console.log("      CONTROLEER: is BEDRAG_TOTAAL incl. of excl. BTW?");
  console.log("      Vergelijk met de aanneemsom zoals zichtbaar in Syntess Atrium.\n");
  const orders = await fbQuery<{
    GC_CODE: string; BEDRAG_TOTAAL: number; METH_BEREKENING: string | null;
    BTW_VERREKENING: string | null; PERC_BTW: number | null;
  }>(`
    SELECT FIRST 5
      w.GC_CODE,
      SUM(o.BEDRAG_TOTAAL) AS BEDRAG_TOTAAL,
      MAX(o.METH_BEREKENING) AS METH_BEREKENING,
      MAX(o.BTW_VERREKENING) AS BTW_VERREKENING,
      MAX(o.PERC_BTW) AS PERC_BTW
    FROM AT_ORDER o
    JOIN AT_WERK w ON w.GC_ID = o.WERK_GC_ID
    WHERE w.ADMINIS_GC_ID = ?
      AND o.BEDRAG_TOTAAL > 0
    GROUP BY w.GC_CODE
    ORDER BY SUM(o.BEDRAG_TOTAAL) DESC
  `, [ADMIN_ID]);
  console.table(orders.map(o => ({
    project:    o.GC_CODE,
    aanneemsom: o.BEDRAG_TOTAAL?.toFixed(2),
    meth:       o.METH_BEREKENING,
    btw_verr:   o.BTW_VERREKENING,
    btw_pct:    o.PERC_BTW,
  })));

  // 4. Omzet per project (gefactureerd)
  console.log("\n[4/5] Gefactureerde omzet — top 10 projecten (8xxx-rubrieken, C-boekingen):");
  console.log("      Vergelijk met 'Gefactureerd' in Syntess Atrium per project.\n");
  const omzet = await fbQuery<{ GC_CODE: string; GEFACTUREERD: number }>(`
    SELECT FIRST 10
      w.GC_CODE,
      SUM(j.BEDRAG) AS GEFACTUREERD
    FROM AT_JOURNAAL j
    JOIN AT_WERK w ON w.GC_ID = j.WERK_GC_ID
    JOIN AT_RUBRIEK r ON r.GC_ID = j.RUBRIEK_GC_ID
    WHERE w.ADMINIS_GC_ID = ?
      AND j.DEBET_CREDIT = 'C'
      AND r.TYPE_RUBRIEK = 'W'
      AND (r.GC_CODE STARTING WITH '8' OR r.GC_CODE STARTING WITH 'INT8')
      AND j.WERK_GC_ID IS NOT NULL AND j.WERK_GC_ID <> 0
    GROUP BY w.GC_CODE
    ORDER BY SUM(j.BEDRAG) DESC
  `, [ADMIN_ID]);
  console.table(omzet.map(r => ({ project: r.GC_CODE, gefactureerd: Number(r.GEFACTUREERD).toFixed(2) })));

  // 5. Kosten per project
  console.log("\n[5/5] Directe kosten — top 10 projecten (7xxx-rubrieken, D-boekingen):");
  console.log("      Vergelijk met 'Directe kosten' in Syntess Atrium per project.\n");
  const kosten = await fbQuery<{ GC_CODE: string; KOSTEN: number }>(`
    SELECT FIRST 10
      w.GC_CODE,
      SUM(j.BEDRAG) AS KOSTEN
    FROM AT_JOURNAAL j
    JOIN AT_WERK w ON w.GC_ID = j.WERK_GC_ID
    JOIN AT_RUBRIEK r ON r.GC_ID = j.RUBRIEK_GC_ID
    WHERE w.ADMINIS_GC_ID = ?
      AND j.DEBET_CREDIT = 'D'
      AND r.TYPE_RUBRIEK = 'W'
      AND (r.GC_CODE STARTING WITH '7' OR r.GC_CODE STARTING WITH 'INT7')
      AND j.WERK_GC_ID IS NOT NULL AND j.WERK_GC_ID <> 0
    GROUP BY w.GC_CODE
    ORDER BY SUM(j.BEDRAG) DESC
  `, [ADMIN_ID]);
  console.table(kosten.map(r => ({ project: r.GC_CODE, kosten: Number(r.KOSTEN).toFixed(2) })));

  console.log("\n" + SEP);
  console.log("Validatie klaar. Controleer:");
  console.log("  • [3] BEDRAG_TOTAAL incl. of excl. BTW? (kijk naar METH_BEREKENING)");
  console.log("  • [4] Gefactureerde bedragen kloppen ze met Atrium?");
  console.log("  • [5] Kostenregels kloppen ze met Atrium?");
  console.log("  • [2] Zijn alle verwachte rubriekcodes aanwezig (8xxx, 7xxx, 1300)?");
  console.log(SEP);
}

main()
  .then(() => process.exit(0))
  .catch(err => { console.error("✗ Validatie mislukt:", err); process.exit(1); });

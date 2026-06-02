/**
 * validate.ts — Draai dit script vóór de eerste sync.
 * Vergelijk de uitvoer met bekende waarden uit Syntess Atrium.
 *
 * Gebruik: ts-node src/validate.ts [adminId]
 * Standaard adminId = 1 (Services)
 */

import dotenv from "dotenv";
dotenv.config();

import { fbQuery, testFirebird } from "./firebird";

const ADMIN_ID = Number(process.argv[2] ?? 1);
const SEP = "─".repeat(70);

async function main() {
  console.log(SEP);
  console.log(`SYNTESS ATRIUM VALIDATIE — adminId=${ADMIN_ID}`);
  console.log(SEP);

  // 1. Verbinding
  console.log("\n[1/5] Firebird verbinding testen...");
  testFirebird();
  console.log("      ✓ Verbinding OK\n");

  // 2. Rubriek codes
  console.log("[2/5] Rubriek codes (7xxx/8xxx/1300):");
  const rubrieken = fbQuery(`
    SELECT FIRST 20 GC_CODE, GC_OMSCHRIJVING, TYPE_RUBRIEK
    FROM AT_RUBRIEK
    WHERE TYPE_RUBRIEK IN ('W', 'B')
      AND (GC_CODE STARTING WITH '7' OR GC_CODE STARTING WITH '8'
           OR GC_CODE STARTING WITH 'INT7' OR GC_CODE STARTING WITH 'INT8'
           OR GC_CODE = '1300'
           OR GC_CODE IN ('4','5','6','9'))
    ORDER BY GC_CODE;
  `);
  console.table(rubrieken.map(r => ({
    code:  r.GC_CODE,
    omschr: r.GC_OMSCHRIJVING.substring(0, 40),
    type:  r.TYPE_RUBRIEK,
  })));

  // 3. BTW-check AT_ORDER
  console.log("\n[3/5] AT_ORDER — BTW-status:");
  const orders = fbQuery(`
    SELECT FIRST 5
      w.GC_CODE,
      SUM(o.BEDRAG_TOTAAL)   AS BEDRAG_TOTAAL,
      MAX(o.METH_BEREKENING) AS METH_BEREKENING,
      MAX(o.BTW_VERREKENING) AS BTW_VERREKENING
    FROM AT_ORDER o
    JOIN AT_WERK w ON w.GC_ID = o.WERK_GC_ID
    WHERE w.ADMINIS_GC_ID = ${ADMIN_ID}
      AND o.BEDRAG_TOTAAL > 0
    GROUP BY w.GC_CODE
    ORDER BY SUM(o.BEDRAG_TOTAAL) DESC;
  `);
  console.table(orders.map(o => ({
    project:    o.GC_CODE,
    aanneemsom: parseFloat(o.BEDRAG_TOTAAL || "0").toFixed(2),
    meth:       o.METH_BEREKENING || "null",
    btw_verr:   o.BTW_VERREKENING || "null",
  })));

  // 4. Gefactureerde omzet (8xxx excl. WIP)
  console.log("\n[4/5] Gefactureerde omzet — top 10 (8xxx C, excl. 8030/8040/8045):");
  const omzet = fbQuery(`
    SELECT FIRST 10
      w.GC_CODE,
      SUM(j.BEDRAG) AS GEFACTUREERD
    FROM AT_JOURNAAL j
    JOIN AT_WERK w ON w.GC_ID = j.WERK_GC_ID
    JOIN AT_RUBRIEK r ON r.GC_ID = j.RUBRIEK_GC_ID
    WHERE w.ADMINIS_GC_ID = ${ADMIN_ID}
      AND j.DEBET_CREDIT = 'C'
      AND r.TYPE_RUBRIEK = 'W'
      AND r.GC_CODE STARTING WITH '8'
      AND r.GC_CODE NOT IN ('8030','8040','8045')
      AND j.WERK_GC_ID IS NOT NULL AND j.WERK_GC_ID <> 0
    GROUP BY w.GC_CODE
    ORDER BY SUM(j.BEDRAG) DESC;
  `);
  console.table(omzet.map(r => ({
    project:      r.GC_CODE,
    gefactureerd: parseFloat(r.GEFACTUREERD || "0").toFixed(2),
  })));

  // 5. Kosten per whitelist-categorie
  console.log("\n[5/5] Kosten-whitelist — top 10 (7xxx + codes 4/5/6/9, D-boekingen):");
  const kosten = fbQuery(`
    SELECT FIRST 10
      w.GC_CODE,
      r.GC_CODE            AS RUBRIEK,
      SUM(j.BEDRAG)        AS KOSTEN
    FROM AT_JOURNAAL j
    JOIN AT_WERK w ON w.GC_ID = j.WERK_GC_ID
    JOIN AT_RUBRIEK r ON r.GC_ID = j.RUBRIEK_GC_ID
    WHERE w.ADMINIS_GC_ID = ${ADMIN_ID}
      AND j.DEBET_CREDIT = 'D'
      AND r.TYPE_RUBRIEK = 'W'
      AND (
        r.GC_CODE STARTING WITH '7'
        OR r.GC_CODE STARTING WITH 'INT7'
        OR r.GC_CODE IN ('4','5','6','9','INT4','INT5','INT6','INT9')
      )
      AND r.GC_CODE NOT IN ('-','5569','5514','5561','5574')
      AND j.WERK_GC_ID IS NOT NULL AND j.WERK_GC_ID <> 0
    GROUP BY w.GC_CODE, r.GC_CODE
    ORDER BY SUM(j.BEDRAG) DESC;
  `);
  console.table(kosten.map(r => ({
    project: r.GC_CODE,
    rubriek: r.RUBRIEK,
    kosten:  parseFloat(r.KOSTEN || "0").toFixed(2),
  })));

  console.log("\n" + SEP);
  console.log("Validatie klaar. Open punten:");
  console.log("  • Is 5569 (reiskosten) een projectkost? → pas OVERHEAD_EXCLUSIONS aan in transform.ts");
  console.log("  • Wat zit er in rubriek '-'? → bevestig uitsluiting correct is");
  console.log(SEP);
}

main()
  .then(() => process.exit(0))
  .catch(err => { console.error("✗ Validatie mislukt:", err); process.exit(1); });

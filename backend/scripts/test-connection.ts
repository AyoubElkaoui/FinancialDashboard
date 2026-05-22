/**
 * Run with: npm run test:connection
 * Tests Firebird connectivity and prints basic DB info.
 */
import "dotenv/config";
import Firebird from "node-firebird";
import { firebirdConfig } from "../src/config.js";

console.log("🔌 Verbinding maken met Firebird...");
console.log(`   Host:     ${firebirdConfig.host}:${firebirdConfig.port}`);
console.log(`   Database: ${firebirdConfig.database}`);
console.log(`   User:     ${firebirdConfig.user}`);
console.log(`   Charset:  ${firebirdConfig.charset}`);
console.log("");

Firebird.attach(firebirdConfig, (err, db) => {
  if (err) {
    console.error("❌ Verbinding mislukt:", err.message);
    process.exit(1);
  }

  console.log("✅ Verbinding geslaagd!\n");

  db.query("SELECT * FROM MON$DATABASE", [], (err2, result) => {
    if (err2) {
      console.error("❌ Query mislukt:", err2.message);
    } else {
      const row = result?.[0] as Record<string, unknown> | undefined;
      console.log("📦 Database info:");
      if (row) {
        console.log(`   Naam:       ${String(row["MON$DATABASE_NAME"] ?? "").trim()}`);
        console.log(`   ODS versie: ${row["MON$ODS_MAJOR_VERSION"]}.${row["MON$ODS_MINOR_VERSION"]}`);
        console.log(`   Pagina's:   ${row["MON$PAGE_BUFFERS"]}`);
      }
    }

    db.query(
      `SELECT COUNT(*) AS CNT FROM RDB$RELATIONS
       WHERE RDB$SYSTEM_FLAG = 0 AND RDB$RELATION_NAME STARTING WITH 'AT_'`,
      [],
      (err3, result3) => {
        if (!err3 && result3?.[0]) {
          const row3 = result3[0] as Record<string, unknown>;
          console.log(`\n📊 Gevonden AT_* tabellen: ${row3["CNT"]}`);
          console.log("\n💡 Tip: Draai 'npm run introspect' voor volledig schema-overzicht.");
        }

        db.detach(() => {
          console.log("\n🔌 Verbinding gesloten.");
          process.exit(0);
        });
      }
    );
  });
});

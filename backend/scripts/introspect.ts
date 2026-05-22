/**
 * Run with: npm run introspect
 * Connects to Firebird, introspects all AT_* tables and writes docs/SCHEMA.md
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { introspectTables, introspectForeignKeys } from "../src/db/schema-introspect.js";
import { destroyPool } from "../src/db/pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, "../docs/SCHEMA.md");

console.log("🔍 Schema introspectie starten...\n");

async function main() {
  const [tables, fks] = await Promise.all([
    introspectTables("AT_"),
    introspectForeignKeys("AT_"),
  ]);

  console.log(`✅ ${tables.length} tabellen gevonden`);
  console.log(`✅ ${fks.length} foreign keys gevonden\n`);

  const fksByTable = fks.reduce<Record<string, typeof fks>>((acc, fk) => {
    (acc[fk.table] ??= []).push(fk);
    return acc;
  }, {});

  const lines: string[] = [
    "# Syntess Atrium — Database Schema",
    "",
    `> Automatisch gegenereerd op ${new Date().toLocaleDateString("nl-NL")} via \`npm run introspect\``,
    `> Aantal tabellen: ${tables.length}`,
    "",
    "## Inhoudsopgave",
    "",
    ...tables.map((t) => `- [${t.name}](#${t.name.toLowerCase()})`),
    "",
    "---",
    "",
  ];

  for (const table of tables) {
    lines.push(`## ${table.name}`, "");
    lines.push("| Kolom | Type | Lengte | Nullable | Default |");
    lines.push("|-------|------|--------|----------|---------|");

    for (const col of table.columns) {
      const typeStr = col.precision
        ? `${col.type}(${col.precision},${Math.abs(col.scale ?? 0)})`
        : col.length && col.type !== "INTEGER" && col.type !== "BIGINT" && col.type !== "SMALLINT"
          ? `${col.type}(${col.length})`
          : col.type;

      lines.push(
        `| ${col.name} | \`${typeStr}\` | ${col.length ?? "-"} | ${col.nullable ? "YES" : "NO"} | ${col.defaultValue ?? "-"} |`
      );
    }

    const tableFks = fksByTable[table.name];
    if (tableFks?.length) {
      lines.push("", "**Foreign Keys:**", "");
      lines.push("| Kolom | → Tabel | → Kolom |");
      lines.push("|-------|---------|---------|");
      for (const fk of tableFks) {
        lines.push(`| ${fk.column} | ${fk.referencedTable} | ${fk.referencedColumn} |`);
      }
    }

    lines.push("", "---", "");
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, lines.join("\n"), "utf8");

  console.log(`📄 Schema weggeschreven naar: ${OUTPUT_FILE}`);
  console.log("\n📋 Tabel samenvatting:");
  for (const t of tables) {
    console.log(`   ${t.name.padEnd(35)} ${t.columns.length} kolommen`);
  }
}

main()
  .catch((err) => {
    console.error("❌ Introspectie mislukt:", err);
    process.exit(1);
  })
  .finally(() => destroyPool());

/**
 * Firebird connector via native isql binary (SET LIST ON mode).
 *
 * node-firebird (pure JS) faalt op Firebird 3.x wire-encryptie.
 * De native libfbclient implementeert het protocol correct.
 * We roepen isql aan via spawnSync met SET LIST ON — één veld per lijn,
 * geen breedte-beperkingen, eenvoudig te parsen.
 */

import { spawnSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { FB_BASE, FB_CONFIG, FB_ISQL_PATH, FB_LD_LIBRARY } from "./config";

// ─── Connection string ─────────────────────────────────────────────────────────

function connStr(fbDatabase?: string): string {
  const db = fbDatabase ?? FB_CONFIG.database;
  return `${FB_BASE.host}/${FB_BASE.port}:${db}`;
}

// ─── List-mode parser ─────────────────────────────────────────────────────────

/**
 * Parseert isql output in LIST-modus (SET LIST ON).
 * Formaat per rij:
 *   KOLOM_NAAM          waarde
 *   VOLGENDE_KOLOM      waarde
 *                                 ← lege regel = rij-scheiding
 *
 * Voordelen t.o.v. fixed-width:
 * - Geen line-truncation bij brede kolommen
 * - Onafhankelijk van kolomvolgorde en uitlijning
 */
function parseIsqlList(output: string): Record<string, string>[] {
  const results: Record<string, string>[] = [];
  let row: Record<string, string> | null = null;

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine;

    // Lege lijn = rij-grens
    if (!line.trim()) {
      if (row && Object.keys(row).length > 0) {
        results.push(row);
        row = null;
      }
      continue;
    }

    // In LIST-modus: "KOLOMNAAM         waarde"
    // Kolomnaam is aaneengesloten (geen spaties), dan minimaal één spatie, dan waarde
    const m = line.match(/^([A-Z_$.][A-Z0-9_$.]*)\s+(.*)/);
    if (m) {
      if (!row) row = {};
      const key = m[1].trim();
      const val = m[2].trimEnd();
      row[key] = val === "<null>" ? "" : val;
    }
    // Regels die niet matchen (bijv. SET NAMES output) worden genegeerd
  }

  // Laatste rij zonder afsluitende lege regel
  if (row && Object.keys(row).length > 0) {
    results.push(row);
  }

  return results;
}

// ─── Publieke API ──────────────────────────────────────────────────────────────

/**
 * Voert een SQL SELECT-query uit via isql (SET LIST ON) en retourneert
 * de rijen als array van string-dictionaries (kolomnaam → waarde).
 *
 * Numerieke waarden zijn strings — converteer expliciet in de caller.
 * adminId en andere parameters worden inline geïnjecteerd (config-only,
 * geen user input → geen SQL-injectierisico).
 */
export function fbQuery<T extends Record<string, string> = Record<string, string>>(
  sql: string,
  fbDatabase?: string   // optioneel DB-pad voor tweede Firebird database
): T[] {
  const tmpFile = join(
    tmpdir(),
    `fb_${Date.now()}_${Math.random().toString(36).slice(2)}.sql`
  );

  const script = `SET NAMES WIN1252;\nSET LIST ON;\n${sql.trimEnd()}\n`;
  writeFileSync(tmpFile, script, "utf8");

  try {
    const proc = spawnSync(
      FB_ISQL_PATH,
      [
        "-user",     FB_BASE.user,
        "-password", FB_BASE.password,
        "-q",
        "-input",    tmpFile,
        connStr(fbDatabase),
      ],
      {
        encoding:  "buffer",
        env:       { ...process.env, LD_LIBRARY_PATH: FB_LD_LIBRARY },
        timeout:   300_000,           // 5 min voor grote queries
        maxBuffer: 256 * 1024 * 1024, // 256 MB — journaal kan groot zijn
      }
    );

    if (proc.error) throw proc.error;

    // Latin-1 = WIN1252-compatibel voor West-Europese tekens (NL/BE/DE/FR)
    const stdout = proc.stdout?.toString("latin1") ?? "";
    const stderr = proc.stderr?.toString("utf8") ?? "";

    if (stdout.includes("Statement failed, SQLSTATE")) {
      const match = stdout.match(/Statement failed[\s\S]*?(?=\n\n|$)/);
      throw new Error(match ? match[0].replace(/\n/g, " ") : "SQL statement failed");
    }
    if (proc.status !== 0 && stderr.trim()) {
      throw new Error(`isql fout (exit ${proc.status}): ${stderr.trim()}`);
    }

    return parseIsqlList(stdout) as T[];
  } finally {
    try { unlinkSync(tmpFile); } catch { /* genegeerd */ }
  }
}

/** Test de Firebird-verbinding voor een specifieke DB. Gooit een fout bij mislukking. */
export function testFirebird(fbDatabase?: string): void {
  const rows = fbQuery<{ ONE: string }>("SELECT 1 AS ONE FROM RDB$DATABASE;", fbDatabase);
  if (!rows[0] || rows[0].ONE !== "1") {
    throw new Error("Firebird health check mislukt");
  }
}

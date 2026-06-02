import Firebird from "node-firebird";
import { FB_CONFIG } from "./config";

type FbRow = Record<string, unknown>;

/** Voer één query uit op een tijdelijke Firebird-verbinding. */
export function fbQuery<T extends FbRow = FbRow>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Firebird.attach(FB_CONFIG, (err, db) => {
      if (err || !db) return reject(err ?? new Error("Firebird attach failed"));
      db.query(sql, params, (qErr: Error | null, rows: T[]) => {
        db.detach();
        if (qErr) return reject(qErr);
        resolve(rows ?? []);
      });
    });
  });
}

/** Test de Firebird-verbinding. */
export async function testFirebird(): Promise<void> {
  const rows = await fbQuery<{ ONE: number }>("SELECT 1 AS ONE FROM RDB$DATABASE");
  if (!rows[0] || rows[0].ONE !== 1) throw new Error("Firebird health check failed");
}

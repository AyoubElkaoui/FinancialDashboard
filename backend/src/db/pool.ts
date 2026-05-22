import Firebird from "node-firebird";
import { firebirdConfig, env } from "../config.js";
import { logger } from "../utils/logger.js";

export type FirebirdConnection = Firebird.Database;

let pool: Firebird.ConnectionPool | null = null;

export function getPool(): Firebird.ConnectionPool {
  if (!pool) {
    pool = Firebird.pool(env.FB_POOL_MAX, firebirdConfig);
    logger.info(
      { host: firebirdConfig.host, port: firebirdConfig.port, max: env.FB_POOL_MAX },
      "Firebird connection pool created"
    );
  }
  return pool;
}

export function destroyPool(): Promise<void> {
  return new Promise((resolve) => {
    if (!pool) return resolve();
    pool.destroy(() => {
      pool = null;
      logger.info("Firebird connection pool destroyed");
      resolve();
    });
  });
}

/**
 * Acquire a connection from the pool, run callback, release automatically.
 */
export function withConnection<T>(
  fn: (db: FirebirdConnection) => Promise<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    getPool().get((err, db) => {
      if (err || !db) {
        return reject(err ?? new Error("Failed to acquire DB connection"));
      }
      fn(db)
        .then(resolve)
        .catch(reject)
        .finally(() => {
          db.detach();
        });
    });
  });
}

export async function testConnection(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    await withConnection(async (db) => {
      await query(db, "SELECT 1 FROM RDB$DATABASE", []);
    });
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    logger.error({ err }, "DB health check failed");
    return { ok: false, latencyMs: Date.now() - start };
  }
}

/**
 * Promisified query helper — use this instead of raw db.query().
 */
export function query<T = Record<string, unknown>>(
  db: FirebirdConnection,
  sql: string,
  params: unknown[]
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err: Error | null, result: T[]) => {
      if (err) return reject(err);
      resolve(result ?? []);
    });
  });
}

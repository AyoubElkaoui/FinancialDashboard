import { withConnection, query as rawQuery, FirebirdConnection } from "./pool.js";
import { logger } from "../utils/logger.js";

export interface QueryOptions {
  /** Tag for logging — e.g. "invoices.list" */
  tag?: string;
}

/**
 * Execute a single parameterized query and return all rows.
 * Opens and closes a connection automatically.
 */
export async function executeQuery<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
  options: QueryOptions = {}
): Promise<T[]> {
  const start = Date.now();
  return withConnection(async (db: FirebirdConnection) => {
    try {
      const rows = await rawQuery<T>(db, sql, params);
      logger.debug(
        { tag: options.tag, rows: rows.length, ms: Date.now() - start },
        "query ok"
      );
      return rows;
    } catch (err) {
      logger.error({ tag: options.tag, sql: sql.slice(0, 200), err }, "query failed");
      throw err;
    }
  });
}

/**
 * Execute a query and return exactly one row, or null if not found.
 */
export async function executeQueryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
  options: QueryOptions = {}
): Promise<T | null> {
  const rows = await executeQuery<T>(sql, params, options);
  return rows[0] ?? null;
}

export interface PaginatedQuery<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Run a data query + COUNT query in parallel and return a paginated result.
 * countSql should be the same query wrapped in SELECT COUNT(*) FROM (...) subq.
 */
export async function executeQueryPaginated<T = Record<string, unknown>>(
  dataSql: string,
  countSql: string,
  params: unknown[],
  page: number,
  pageSize: number,
  options: QueryOptions = {}
): Promise<PaginatedQuery<T>> {
  const [dataRows, countRow] = await Promise.all([
    executeQuery<T>(dataSql, params, options),
    executeQuery<{ CNT: number }>(countSql, params, { tag: `${options.tag}.count` }),
  ]);

  const total = Number(countRow[0]?.CNT ?? 0);

  return {
    data: dataRows,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

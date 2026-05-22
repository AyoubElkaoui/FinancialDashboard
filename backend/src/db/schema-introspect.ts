import { withConnection, query } from "./pool.js";

export interface ColumnInfo {
  name: string;
  type: string;
  length: number | null;
  precision: number | null;
  scale: number | null;
  nullable: boolean;
  defaultValue: string | null;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
}

export interface ForeignKeyInfo {
  table: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
  constraintName: string;
}

const FIELD_TYPE_MAP: Record<number, string> = {
  7: "SMALLINT",
  8: "INTEGER",
  10: "FLOAT",
  12: "DATE",
  13: "TIME",
  14: "CHAR",
  16: "BIGINT",
  27: "DOUBLE PRECISION",
  35: "TIMESTAMP",
  37: "VARCHAR",
  261: "BLOB",
};

export async function introspectTables(prefix = "AT_"): Promise<TableInfo[]> {
  return withConnection(async (db) => {
    const tables = await query<{ RDB$RELATION_NAME: string }>(
      db,
      `SELECT TRIM(RDB$RELATION_NAME) AS "RDB$RELATION_NAME"
       FROM RDB$RELATIONS
       WHERE RDB$SYSTEM_FLAG = 0
         AND RDB$RELATION_NAME STARTING WITH ?
       ORDER BY 1`,
      [prefix]
    );

    const result: TableInfo[] = [];

    for (const t of tables) {
      const tableName = t["RDB$RELATION_NAME"].trim();

      const cols = await query<{
        RDB$FIELD_NAME: string;
        RDB$FIELD_TYPE: number;
        RDB$FIELD_LENGTH: number;
        RDB$FIELD_PRECISION: number;
        RDB$FIELD_SCALE: number;
        RDB$NULL_FLAG: number | null;
        RDB$DEFAULT_SOURCE: string | null;
      }>(
        db,
        `SELECT
           TRIM(rf.RDB$FIELD_NAME)     AS "RDB$FIELD_NAME",
           f.RDB$FIELD_TYPE            AS "RDB$FIELD_TYPE",
           f.RDB$FIELD_LENGTH          AS "RDB$FIELD_LENGTH",
           f.RDB$FIELD_PRECISION       AS "RDB$FIELD_PRECISION",
           f.RDB$FIELD_SCALE           AS "RDB$FIELD_SCALE",
           rf.RDB$NULL_FLAG            AS "RDB$NULL_FLAG",
           rf.RDB$DEFAULT_SOURCE       AS "RDB$DEFAULT_SOURCE"
         FROM RDB$RELATION_FIELDS rf
         JOIN RDB$FIELDS f ON f.RDB$FIELD_NAME = rf.RDB$FIELD_SOURCE
         WHERE rf.RDB$RELATION_NAME = ?
         ORDER BY rf.RDB$FIELD_POSITION`,
        [tableName]
      );

      result.push({
        name: tableName,
        columns: cols.map((c) => ({
          name: c["RDB$FIELD_NAME"].trim(),
          type: FIELD_TYPE_MAP[c["RDB$FIELD_TYPE"]] ?? `TYPE_${c["RDB$FIELD_TYPE"]}`,
          length: c["RDB$FIELD_LENGTH"] ?? null,
          precision: c["RDB$FIELD_PRECISION"] ?? null,
          scale: c["RDB$FIELD_SCALE"] !== 0 ? c["RDB$FIELD_SCALE"] : null,
          nullable: c["RDB$NULL_FLAG"] !== 1,
          defaultValue: c["RDB$DEFAULT_SOURCE"]?.trim().replace(/^DEFAULT\s+/i, "") ?? null,
        })),
      });
    }

    return result;
  });
}

export async function introspectForeignKeys(prefix = "AT_"): Promise<ForeignKeyInfo[]> {
  return withConnection(async (db) => {
    const rows = await query<{
      CONSTRAINT_NAME: string;
      TABLE_NAME: string;
      COLUMN_NAME: string;
      REF_TABLE: string;
      REF_COLUMN: string;
    }>(
      db,
      `SELECT
         TRIM(rc.RDB$CONSTRAINT_NAME)  AS "CONSTRAINT_NAME",
         TRIM(rc.RDB$RELATION_NAME)    AS "TABLE_NAME",
         TRIM(iseg.RDB$FIELD_NAME)     AS "COLUMN_NAME",
         TRIM(ref.RDB$RELATION_NAME)   AS "REF_TABLE",
         TRIM(riseg.RDB$FIELD_NAME)    AS "REF_COLUMN"
       FROM RDB$REF_CONSTRAINTS refc
       JOIN RDB$RELATION_CONSTRAINTS rc
         ON rc.RDB$CONSTRAINT_NAME = refc.RDB$CONSTRAINT_NAME
       JOIN RDB$INDEX_SEGMENTS iseg
         ON iseg.RDB$INDEX_NAME = rc.RDB$INDEX_NAME
       JOIN RDB$RELATION_CONSTRAINTS ref
         ON ref.RDB$CONSTRAINT_NAME = refc.RDB$CONST_NAME_UQ
       JOIN RDB$INDEX_SEGMENTS riseg
         ON riseg.RDB$INDEX_NAME = ref.RDB$INDEX_NAME
       WHERE rc.RDB$RELATION_NAME STARTING WITH ?
       ORDER BY 1, iseg.RDB$FIELD_POSITION`,
      [prefix]
    );

    return rows.map((r) => ({
      constraintName: r["CONSTRAINT_NAME"].trim(),
      table: r["TABLE_NAME"].trim(),
      column: r["COLUMN_NAME"].trim(),
      referencedTable: r["REF_TABLE"].trim(),
      referencedColumn: r["REF_COLUMN"].trim(),
    }));
  });
}

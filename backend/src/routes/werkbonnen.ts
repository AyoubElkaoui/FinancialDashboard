import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { executeQuery, executeQueryOne, executeQueryPaginated } from "../db/query.js";
import { authMiddleware } from "../middleware/auth.js";
import { env } from "../config.js";
import * as mock from "../mock/handlers.js";
import { generateWerkbonnenExcel } from "../utils/werkbonnen-export.js";

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(250).default(50),
  search: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  klantId: z.coerce.number().optional(),
  projectId: z.coerce.number().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sortBy: z.enum(["BONNUMMER", "DATUM", "STATUS", "KLANT", "MARGE_PCT"]).default("DATUM"),
  sortDir: z.enum(["ASC", "DESC"]).default("DESC"),
});

const exportSchema = listSchema.extend({
  format: z.enum(["xlsx", "json"]).default("xlsx"),
}).omit({ page: true, pageSize: true, sortBy: true, sortDir: true });

const ALLOWED_SORT = new Set(["BONNUMMER", "DATUM", "STATUS", "KLANT"]);

export async function werkbonRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  app.get("/api/v1/werkbonnen", async (request, reply) => {
    const parse = listSchema.safeParse(request.query);
    if (!parse.success) return reply.code(400).send({ error: parse.error.flatten() });
    const q = parse.data;

    if (env.MOCK_MODE) return mock.mockWerkbonnenList(q);

    const params: unknown[] = [];
    const where: string[] = [];
    if (q.search)    { params.push(`%${q.search.toUpperCase()}%`, `%${q.search.toUpperCase()}%`); where.push("(UPPER(w.BONNUMMER) LIKE ? OR UPPER(w.OMSCHRIJVING) LIKE ?)"); }
    if (q.status)    { params.push(q.status);    where.push("w.STATUS = ?"); }
    if (q.type)      { params.push(q.type);      where.push("w.TYPE = ?"); }
    if (q.klantId)   { params.push(q.klantId);   where.push("w.KLANT_ID = ?"); }
    if (q.projectId) { params.push(q.projectId); where.push("w.PROJECT_ID = ?"); }
    if (q.dateFrom)  { params.push(q.dateFrom);  where.push("w.DATUM >= ?"); }
    if (q.dateTo)    { params.push(q.dateTo);    where.push("w.DATUM <= ?"); }

    const wc = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const orderCol = ALLOWED_SORT.has(q.sortBy) ? q.sortBy : "DATUM";
    const offset = (q.page - 1) * q.pageSize;

    return executeQueryPaginated(
      `SELECT FIRST ${q.pageSize} SKIP ${offset}
         w.ID, w.BONNUMMER, w.DATUM, w.STATUS, w.OMSCHRIJVING, w.TYPE,
         kl.NAAM AS KLANT, w.OBJECTLOCATIE, w.ADRES, w.FASE, w.UITVOERINGSDATUM,
         w.COORDINATOR, p.PROJECTNUMMER, p.NAAM AS PROJECT_NAAM,
         w.KOSTEN, w.INDIRECT, w.ALGEMEEN, w.TOTALE_KOSTEN,
         w.OPBRENGSTEN, w.B_MARGE, w.MARGE_PCT,
         w.FACTUURNUMMER, w.FACTUURDATUM, w.BETAALD
       FROM AT_WERKBONNEN w
       LEFT JOIN AT_KLANTEN kl ON kl.ID = w.KLANT_ID
       LEFT JOIN AT_PROJECTEN p ON p.ID = w.PROJECT_ID
       ${wc} ORDER BY w.${orderCol} ${q.sortDir}`,
      `SELECT COUNT(*) AS CNT FROM AT_WERKBONNEN w
       LEFT JOIN AT_KLANTEN kl ON kl.ID = w.KLANT_ID
       LEFT JOIN AT_PROJECTEN p ON p.ID = w.PROJECT_ID ${wc}`,
      params, q.page, q.pageSize, { tag: "werkbonnen.list" }
    );
  });

  // ─── Export endpoint ─────────────────────────────────────────────────────────
  app.get("/api/v1/werkbonnen/export", async (request, reply) => {
    const parse = exportSchema.safeParse(request.query);
    if (!parse.success) return reply.code(400).send({ error: parse.error.flatten() });
    const q = parse.data;

    let rows: Record<string, unknown>[];

    if (env.MOCK_MODE) {
      rows = mock.mockWerkbonnenExportData(q) as Record<string, unknown>[];
    } else {
      const params: unknown[] = [];
      const where: string[] = [];
      if (q.search)    { params.push(`%${q.search.toUpperCase()}%`); where.push("UPPER(w.BONNUMMER) LIKE ?"); }
      if (q.status)    { params.push(q.status);    where.push("w.STATUS = ?"); }
      if (q.klantId)   { params.push(q.klantId);   where.push("w.KLANT_ID = ?"); }
      if (q.dateFrom)  { params.push(q.dateFrom);  where.push("w.DATUM >= ?"); }
      if (q.dateTo)    { params.push(q.dateTo);    where.push("w.DATUM <= ?"); }
      const wc = where.length ? `WHERE ${where.join(" AND ")}` : "";
      rows = await executeQuery(
        `SELECT w.BONNUMMER AS NUMMER, w.DATUM, w.OMSCHRIJVING, w.TYPE,
                kl.NAAM AS MOEDERRELATIE, w.OBJECTLOCATIE, w.ADRES, w.FASE,
                w.UITVOERINGSDATUM, w.COORDINATOR,
                w.KOSTEN, w.INDIRECT, w.ALGEMEEN, w.TOTALE_KOSTEN,
                w.OPBRENGSTEN, w.B_MARGE, w.MARGE_PCT,
                w.FACTUURNUMMER, w.FACTUURDATUM,
                CASE WHEN w.BETAALD IS NOT NULL THEN 'Ja' ELSE 'Nee' END AS BETAALD
         FROM AT_WERKBONNEN w
         LEFT JOIN AT_KLANTEN kl ON kl.ID = w.KLANT_ID
         ${wc} ORDER BY w.DATUM DESC`,
        params, { tag: "werkbonnen.export" }
      ) as Record<string, unknown>[];
    }

    if (q.format === "json") {
      return { generatedAt: new Date().toISOString(), total: rows.length, data: rows };
    }

    const buffer = await generateWerkbonnenExcel(rows);
    const filename = `werkbonnen-${new Date().toISOString().slice(0, 10)}.xlsx`;
    return reply
      .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .header("Content-Disposition", `attachment; filename="${filename}"`)
      .send(buffer);
  });

  // ─── Detail ───────────────────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>("/api/v1/werkbonnen/:id", async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isFinite(id)) return reply.code(400).send({ error: "Invalid ID" });

    if (env.MOCK_MODE) {
      const result = mock.mockWerkbonDetail(id);
      return result ? result : reply.code(404).send({ error: "Werkbon niet gevonden" });
    }

    const bon = await executeQueryOne(
      `SELECT w.*, kl.NAAM AS KLANT, p.PROJECTNUMMER, p.NAAM AS PROJECT_NAAM
       FROM AT_WERKBONNEN w
       LEFT JOIN AT_KLANTEN kl ON kl.ID = w.KLANT_ID
       LEFT JOIN AT_PROJECTEN p ON p.ID = w.PROJECT_ID
       WHERE w.ID = ?`,
      [id], { tag: "werkbonnen.detail" }
    );
    if (!bon) return reply.code(404).send({ error: "Werkbon niet gevonden" });
    const regels = await executeQuery(
      `SELECT * FROM AT_WERKBON_REGELS WHERE WERKBON_ID = ? ORDER BY REGELNUMMER`,
      [id], { tag: "werkbonnen.regels" }
    );
    return { ...bon, regels };
  });
}

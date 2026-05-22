import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { executeQuery, executeQueryPaginated } from "../db/query.js";
import { authMiddleware } from "../middleware/auth.js";
import { env } from "../config.js";
import * as mock from "../mock/handlers.js";

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(250).default(50),
  search: z.string().optional(),
  projectId: z.coerce.number().optional(),
  leverancierId: z.coerce.number().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sortBy: z.enum(["DATUM", "BEDRAG_EXCL"]).default("DATUM"),
  sortDir: z.enum(["ASC", "DESC"]).default("DESC"),
});

const ALLOWED_SORT = new Set(["DATUM", "BEDRAG_EXCL"]);

export async function purchaseRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  app.get("/api/v1/inkoop", async (request, reply) => {
    const parse = listSchema.safeParse(request.query);
    if (!parse.success) return reply.code(400).send({ error: parse.error.flatten() });
    const q = parse.data;

    if (env.MOCK_MODE) return mock.mockInkoopList(q);

    const params: unknown[] = [];
    const where: string[] = [];
    if (q.search) { params.push(`%${q.search.toUpperCase()}%`); where.push("UPPER(i.FACTUURNUMMER) LIKE ?"); }
    if (q.projectId) { params.push(q.projectId); where.push("i.PROJECT_ID = ?"); }
    if (q.leverancierId) { params.push(q.leverancierId); where.push("i.LEVERANCIER_ID = ?"); }
    if (q.dateFrom) { params.push(q.dateFrom); where.push("i.DATUM >= ?"); }
    if (q.dateTo) { params.push(q.dateTo); where.push("i.DATUM <= ?"); }

    const wc = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const orderCol = ALLOWED_SORT.has(q.sortBy) ? q.sortBy : "DATUM";
    const offset = (q.page - 1) * q.pageSize;

    return executeQueryPaginated(
      `SELECT FIRST ${q.pageSize} SKIP ${offset} i.ID, i.FACTUURNUMMER, i.DATUM, i.BEDRAG_EXCL, i.BTW, i.TOTAALBEDRAG, i.STATUS, lev.NAAM AS LEVERANCIER FROM AT_INKOOPFACTUREN i LEFT JOIN AT_LEVERANCIERS lev ON lev.ID = i.LEVERANCIER_ID ${wc} ORDER BY i.${orderCol} ${q.sortDir}`,
      `SELECT COUNT(*) AS CNT FROM AT_INKOOPFACTUREN i LEFT JOIN AT_LEVERANCIERS lev ON lev.ID = i.LEVERANCIER_ID ${wc}`,
      params, q.page, q.pageSize, { tag: "purchases.list" }
    );
  });

  app.get("/api/v1/inkoop/per-kostensoort", async () => {
    if (env.MOCK_MODE) return mock.mockInkoopPerKostensoort();
    return executeQuery(
      `SELECT ks.OMSCHRIJVING AS KOSTENSOORT, COALESCE(SUM(i.BEDRAG_EXCL), 0) AS BEDRAG FROM AT_INKOOPFACTUREN i LEFT JOIN AT_KOSTENSOORT ks ON ks.ID = i.KOSTENSOORT_ID WHERE EXTRACT(YEAR FROM i.DATUM) = EXTRACT(YEAR FROM CURRENT_DATE) GROUP BY ks.OMSCHRIJVING ORDER BY 2 DESC`,
      [], { tag: "purchases.per-kostensoort" }
    );
  });
}

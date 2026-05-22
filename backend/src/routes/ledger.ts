import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { executeQuery, executeQueryPaginated } from "../db/query.js";
import { authMiddleware } from "../middleware/auth.js";
import { env } from "../config.js";
import * as mock from "../mock/handlers.js";

const mutationsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(250).default(50),
  rubriekId: z.coerce.number().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sortDir: z.enum(["ASC", "DESC"]).default("DESC"),
});

export async function ledgerRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  app.get("/api/v1/grootboek/rubrieken", async () => {
    if (env.MOCK_MODE) return mock.mockGrootboekRubrieken();
    return executeQuery(`SELECT ID, REKENINGNUMMER, OMSCHRIJVING, SOORT FROM AT_GROOTBOEK_RUBRIEKEN ORDER BY REKENINGNUMMER`, [], { tag: "ledger.rubrieken" });
  });

  app.get("/api/v1/grootboek/mutaties", async (request, reply) => {
    const parse = mutationsSchema.safeParse(request.query);
    if (!parse.success) return reply.code(400).send({ error: parse.error.flatten() });
    const q = parse.data;

    if (env.MOCK_MODE) return mock.mockGrootboekMutaties(q);

    const params: unknown[] = [];
    const where: string[] = [];
    if (q.rubriekId) { params.push(q.rubriekId); where.push("m.RUBRIEK_ID = ?"); }
    if (q.dateFrom) { params.push(q.dateFrom); where.push("m.DATUM >= ?"); }
    if (q.dateTo) { params.push(q.dateTo); where.push("m.DATUM <= ?"); }

    const wc = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (q.page - 1) * q.pageSize;

    return executeQueryPaginated(
      `SELECT FIRST ${q.pageSize} SKIP ${offset} m.ID, m.DATUM, m.OMSCHRIJVING, m.DEBET, m.CREDIT, r.REKENINGNUMMER, r.OMSCHRIJVING AS RUBRIEK FROM AT_GROOTBOEK_MUTATIES m LEFT JOIN AT_GROOTBOEK_RUBRIEKEN r ON r.ID = m.RUBRIEK_ID ${wc} ORDER BY m.DATUM ${q.sortDir}`,
      `SELECT COUNT(*) AS CNT FROM AT_GROOTBOEK_MUTATIES m LEFT JOIN AT_GROOTBOEK_RUBRIEKEN r ON r.ID = m.RUBRIEK_ID ${wc}`,
      params, q.page, q.pageSize, { tag: "ledger.mutaties" }
    );
  });

  app.get("/api/v1/grootboek/resultaat", async () => {
    if (env.MOCK_MODE) return mock.mockGrootboekResultaat();
    return executeQuery(
      `SELECT r.SOORT, r.REKENINGNUMMER, r.OMSCHRIJVING, COALESCE(SUM(m.DEBET), 0) AS DEBET_TOTAAL, COALESCE(SUM(m.CREDIT), 0) AS CREDIT_TOTAAL, COALESCE(SUM(m.CREDIT), 0) - COALESCE(SUM(m.DEBET), 0) AS SALDO FROM AT_GROOTBOEK_RUBRIEKEN r LEFT JOIN AT_GROOTBOEK_MUTATIES m ON m.RUBRIEK_ID = r.ID AND EXTRACT(YEAR FROM m.DATUM) = EXTRACT(YEAR FROM CURRENT_DATE) GROUP BY r.SOORT, r.REKENINGNUMMER, r.OMSCHRIJVING ORDER BY r.REKENINGNUMMER`,
      [], { tag: "ledger.resultaat" }
    );
  });
}

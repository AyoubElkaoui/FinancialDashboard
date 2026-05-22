import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { executeQuery, executeQueryOne, executeQueryPaginated } from "../db/query.js";
import { authMiddleware } from "../middleware/auth.js";
import { env } from "../config.js";
import * as mock from "../mock/handlers.js";

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(250).default(50),
  search: z.string().optional(),
  status: z.enum(["open", "betaald", "alle"]).default("alle"),
  klantId: z.coerce.number().optional(),
  projectId: z.coerce.number().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sortBy: z.enum(["FACTUURNUMMER", "DATUM", "TOTAALBEDRAG", "OPENSTAAND"]).default("DATUM"),
  sortDir: z.enum(["ASC", "DESC"]).default("DESC"),
});

const ALLOWED_SORT = new Set(["FACTUURNUMMER", "DATUM", "TOTAALBEDRAG", "OPENSTAAND"]);

export async function invoiceRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  app.get("/api/v1/facturen", async (request, reply) => {
    const parse = listSchema.safeParse(request.query);
    if (!parse.success) return reply.code(400).send({ error: parse.error.flatten() });
    const q = parse.data;

    if (env.MOCK_MODE) return mock.mockFacturenList(q);

    const params: unknown[] = [];
    const where: string[] = [];
    if (q.search) { params.push(`%${q.search.toUpperCase()}%`); where.push("UPPER(k.FACTUURNUMMER) LIKE ?"); }
    if (q.status === "open") where.push("k.OPENSTAAND > 0");
    if (q.status === "betaald") where.push("k.OPENSTAAND <= 0");
    if (q.klantId) { params.push(q.klantId); where.push("k.KLANT_ID = ?"); }
    if (q.projectId) { params.push(q.projectId); where.push("k.PROJECT_ID = ?"); }
    if (q.dateFrom) { params.push(q.dateFrom); where.push("k.DATUM >= ?"); }
    if (q.dateTo) { params.push(q.dateTo); where.push("k.DATUM <= ?"); }

    const wc = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const orderCol = ALLOWED_SORT.has(q.sortBy) ? q.sortBy : "DATUM";
    const offset = (q.page - 1) * q.pageSize;

    return executeQueryPaginated(
      `SELECT FIRST ${q.pageSize} SKIP ${offset} k.ID, k.FACTUURNUMMER, k.DATUM, k.VERVALDATUM, k.BEDRAG_EXCL, k.BTW, k.TOTAALBEDRAG, k.OPENSTAAND, k.STATUS, kl.NAAM AS KLANT, DATEDIFF(DAY, k.VERVALDATUM, CURRENT_DATE) AS DAGEN_OVERDUE FROM AT_KLNTBREG k LEFT JOIN AT_KLANTEN kl ON kl.ID = k.KLANT_ID ${wc} ORDER BY k.${orderCol} ${q.sortDir}`,
      `SELECT COUNT(*) AS CNT FROM AT_KLNTBREG k LEFT JOIN AT_KLANTEN kl ON kl.ID = k.KLANT_ID ${wc}`,
      params, q.page, q.pageSize, { tag: "invoices.list" }
    );
  });

  app.get("/api/v1/facturen/aging", async () => {
    if (env.MOCK_MODE) return mock.mockFacturenAging();
    return executeQuery(
      `SELECT CASE WHEN DATEDIFF(DAY, k.VERVALDATUM, CURRENT_DATE) <= 0 THEN 'current' WHEN DATEDIFF(DAY, k.VERVALDATUM, CURRENT_DATE) <= 30 THEN '1-30' WHEN DATEDIFF(DAY, k.VERVALDATUM, CURRENT_DATE) <= 60 THEN '31-60' WHEN DATEDIFF(DAY, k.VERVALDATUM, CURRENT_DATE) <= 90 THEN '61-90' ELSE '90+' END AS BUCKET, COUNT(*) AS AANTAL, SUM(k.OPENSTAAND) AS BEDRAG FROM AT_KLNTBREG k WHERE k.OPENSTAAND > 0 GROUP BY 1 ORDER BY 1`,
      [], { tag: "invoices.aging" }
    );
  });

  app.get<{ Params: { id: string } }>("/api/v1/facturen/:id", async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isFinite(id)) return reply.code(400).send({ error: "Invalid ID" });

    if (env.MOCK_MODE) {
      const result = mock.mockFactuurDetail(id);
      return result ? result : reply.code(404).send({ error: "Factuur niet gevonden" });
    }

    const header = await executeQueryOne(`SELECT k.*, kl.NAAM AS KLANT, kl.ADRES, kl.POSTCODE, kl.PLAATS FROM AT_KLNTBREG k LEFT JOIN AT_KLANTEN kl ON kl.ID = k.KLANT_ID WHERE k.ID = ?`, [id], { tag: "invoices.detail" });
    if (!header) return reply.code(404).send({ error: "Factuur niet gevonden" });
    const regels = await executeQuery(`SELECT * FROM AT_DOCUMENT WHERE BREG_ID = ? ORDER BY REGELNUMMER`, [id], { tag: "invoices.regels" });
    return { ...header, regels };
  });
}

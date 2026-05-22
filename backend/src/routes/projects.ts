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
  status: z.string().optional(),
  klantId: z.coerce.number().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sortBy: z.enum(["PROJECTNUMMER", "NAAM", "STARTDATUM", "STATUS"]).default("PROJECTNUMMER"),
  sortDir: z.enum(["ASC", "DESC"]).default("DESC"),
});

const ALLOWED_SORT = new Set(["PROJECTNUMMER", "NAAM", "STARTDATUM", "STATUS"]);

export async function projectRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  app.get("/api/v1/projecten", async (request, reply) => {
    const parse = listSchema.safeParse(request.query);
    if (!parse.success) return reply.code(400).send({ error: parse.error.flatten() });
    const q = parse.data;

    if (env.MOCK_MODE) return mock.mockProjectenList(q);

    const params: unknown[] = [];
    const where: string[] = [];
    if (q.search) { params.push(`%${q.search.toUpperCase()}%`, `%${q.search.toUpperCase()}%`); where.push("(UPPER(p.NAAM) LIKE ? OR UPPER(p.PROJECTNUMMER) LIKE ?)"); }
    if (q.status) { params.push(q.status); where.push("p.STATUS = ?"); }
    if (q.klantId) { params.push(q.klantId); where.push("p.KLANT_ID = ?"); }
    if (q.dateFrom) { params.push(q.dateFrom); where.push("p.STARTDATUM >= ?"); }
    if (q.dateTo) { params.push(q.dateTo); where.push("p.STARTDATUM <= ?"); }

    const wc = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const orderCol = ALLOWED_SORT.has(q.sortBy) ? q.sortBy : "PROJECTNUMMER";
    const offset = (q.page - 1) * q.pageSize;

    return executeQueryPaginated(
      `SELECT FIRST ${q.pageSize} SKIP ${offset} p.ID, p.PROJECTNUMMER, p.NAAM, p.STATUS, p.STARTDATUM, p.EINDDATUM, kl.NAAM AS KLANT FROM AT_PROJECTEN p LEFT JOIN AT_KLANTEN kl ON kl.ID = p.KLANT_ID ${wc} ORDER BY p.${orderCol} ${q.sortDir}`,
      `SELECT COUNT(*) AS CNT FROM AT_PROJECTEN p LEFT JOIN AT_KLANTEN kl ON kl.ID = p.KLANT_ID ${wc}`,
      params, q.page, q.pageSize, { tag: "projects.list" }
    );
  });

  app.get<{ Params: { id: string } }>("/api/v1/projecten/:id", async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isFinite(id)) return reply.code(400).send({ error: "Invalid ID" });

    if (env.MOCK_MODE) {
      const result = mock.mockProjectDetail(id);
      return result ? result : reply.code(404).send({ error: "Project niet gevonden" });
    }

    const project = await executeQueryOne(`SELECT p.*, kl.NAAM AS KLANT FROM AT_PROJECTEN p LEFT JOIN AT_KLANTEN kl ON kl.ID = p.KLANT_ID WHERE p.ID = ?`, [id], { tag: "projects.detail" });
    if (!project) return reply.code(404).send({ error: "Project niet gevonden" });

    const [werkbonnen, facturen] = await Promise.all([
      executeQuery(`SELECT w.BONNUMMER, w.DATUM, w.STATUS, w.OMSCHRIJVING FROM AT_WERKBONNEN w WHERE w.PROJECT_ID = ? ORDER BY w.DATUM DESC`, [id], { tag: "projects.werkbonnen" }),
      executeQuery(`SELECT k.FACTUURNUMMER, k.DATUM, k.BEDRAG_EXCL, k.BTW, k.TOTAALBEDRAG, k.STATUS FROM AT_KLNTBREG k WHERE k.PROJECT_ID = ? ORDER BY k.DATUM DESC`, [id], { tag: "projects.facturen" }),
    ]);
    return { ...project, werkbonnen, facturen };
  });
}

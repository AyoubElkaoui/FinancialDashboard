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
  sortBy: z.enum(["NAAM", "OMZET", "OPENSTAAND"]).default("NAAM"),
  sortDir: z.enum(["ASC", "DESC"]).default("ASC"),
});

const ALLOWED_SORT = new Set(["NAAM", "OMZET", "OPENSTAAND"]);

export async function customerRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  app.get("/api/v1/klanten", async (request, reply) => {
    const parse = listSchema.safeParse(request.query);
    if (!parse.success) return reply.code(400).send({ error: parse.error.flatten() });
    const q = parse.data;

    if (env.MOCK_MODE) return mock.mockKlantenList(q);

    const params: unknown[] = [];
    const where: string[] = [];
    if (q.search) { params.push(`%${q.search.toUpperCase()}%`); where.push("UPPER(kl.NAAM) LIKE ?"); }

    const wc = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const orderCol = ALLOWED_SORT.has(q.sortBy) ? q.sortBy : "NAAM";
    const offset = (q.page - 1) * q.pageSize;

    return executeQueryPaginated(
      `SELECT FIRST ${q.pageSize} SKIP ${offset} kl.ID, kl.NAAM, kl.KLANTNUMMER, kl.POSTCODE, kl.PLAATS, kl.EMAIL, kl.TELEFOON, COALESCE(omzet.TOTAAL, 0) AS OMZET, COALESCE(open.BEDRAG, 0) AS OPENSTAAND FROM AT_KLANTEN kl LEFT JOIN (SELECT KLANT_ID, SUM(TOTAALBEDRAG) AS TOTAAL FROM AT_KLNTBREG WHERE EXTRACT(YEAR FROM DATUM) = EXTRACT(YEAR FROM CURRENT_DATE) GROUP BY KLANT_ID) omzet ON omzet.KLANT_ID = kl.ID LEFT JOIN (SELECT KLANT_ID, SUM(OPENSTAAND) AS BEDRAG FROM AT_KLNTBREG WHERE OPENSTAAND > 0 GROUP BY KLANT_ID) open ON open.KLANT_ID = kl.ID ${wc} ORDER BY ${orderCol === "OMZET" ? "omzet.TOTAAL" : orderCol === "OPENSTAAND" ? "open.BEDRAG" : `kl.${orderCol}`} ${q.sortDir}`,
      `SELECT COUNT(*) AS CNT FROM AT_KLANTEN kl ${wc}`,
      params, q.page, q.pageSize, { tag: "customers.list" }
    );
  });

  app.get<{ Params: { id: string } }>("/api/v1/klanten/:id", async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isFinite(id)) return reply.code(400).send({ error: "Invalid ID" });

    if (env.MOCK_MODE) {
      const result = mock.mockKlantDetail(id);
      return result ? result : reply.code(404).send({ error: "Klant niet gevonden" });
    }

    const klant = await executeQueryOne("SELECT * FROM AT_KLANTEN WHERE ID = ?", [id], { tag: "customers.detail" });
    if (!klant) return reply.code(404).send({ error: "Klant niet gevonden" });

    const [projecten, facturen] = await Promise.all([
      executeQuery(`SELECT PROJECTNUMMER, NAAM, STATUS, STARTDATUM, EINDDATUM FROM AT_PROJECTEN WHERE KLANT_ID = ? ORDER BY STARTDATUM DESC`, [id], { tag: "customers.projecten" }),
      executeQuery(`SELECT FACTUURNUMMER, DATUM, TOTAALBEDRAG, OPENSTAAND, STATUS FROM AT_KLNTBREG WHERE KLANT_ID = ? ORDER BY DATUM DESC ROWS 20`, [id], { tag: "customers.facturen" }),
    ]);
    return { ...klant, projecten, facturen };
  });
}

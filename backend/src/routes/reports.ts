import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { executeQuery } from "../db/query.js";
import { authMiddleware } from "../middleware/auth.js";
import { env } from "../config.js";
import { generateExcel } from "../utils/excel-export.js";
import * as mock from "../mock/handlers.js";

const reportSchema = z.object({
  type: z.enum(["omzet-project", "openstaande-debiteuren", "marge-projectleider", "inkoop-kostensoort"]),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  format: z.enum(["json", "xlsx"]).default("json"),
});

type ColumnDef = { key: string; header: string; type?: "currency" | "number" | "date" };

const REPORT_DEFINITIONS: Record<string, {
  title: string;
  getMockData: (dateFrom?: string, dateTo?: string) => Record<string, unknown>[];
  getRealData: (dateFrom?: string, dateTo?: string) => Promise<Record<string, unknown>[]>;
  columns: ColumnDef[];
}> = {
  "omzet-project": {
    title: "Omzet per project",
    getMockData: (f, t) => mock.mockRapportOmzetProject(f, t) as Record<string, unknown>[],
    getRealData: async (f, t) => {
      const where: string[] = [];
      const params: unknown[] = [];
      if (f) { where.push("k.DATUM >= ?"); params.push(f); }
      if (t) { where.push("k.DATUM <= ?"); params.push(t); }
      return executeQuery(
        `SELECT p.PROJECTNUMMER, p.NAAM, COALESCE(SUM(d.BEDRAG_EXCL), 0) AS OMZET FROM AT_PROJECTEN p LEFT JOIN AT_KLNTBREG k ON k.PROJECT_ID = p.ID LEFT JOIN AT_DOCUMENT d ON d.BREG_ID = k.ID ${where.length ? "WHERE " + where.join(" AND ") : ""} GROUP BY p.PROJECTNUMMER, p.NAAM ORDER BY 3 DESC`,
        params, { tag: "reports.omzet-project" }
      ) as Promise<Record<string, unknown>[]>;
    },
    columns: [
      { key: "PROJECTNUMMER", header: "Projectnummer" },
      { key: "NAAM", header: "Naam" },
      { key: "OMZET", header: "Omzet (excl. BTW)", type: "currency" },
    ],
  },
  "openstaande-debiteuren": {
    title: "Openstaande debiteuren",
    getMockData: () => mock.mockRapportOpenDebiteuren() as Record<string, unknown>[],
    getRealData: async () => executeQuery(
      `SELECT kl.NAAM AS KLANT, k.FACTUURNUMMER, k.DATUM, k.VERVALDATUM, k.TOTAALBEDRAG, k.OPENSTAAND, DATEDIFF(DAY, k.VERVALDATUM, CURRENT_DATE) AS DAGEN_OVERDUE FROM AT_KLNTBREG k JOIN AT_KLANTEN kl ON kl.ID = k.KLANT_ID WHERE k.OPENSTAAND > 0 ORDER BY DAGEN_OVERDUE DESC`,
      [], { tag: "reports.debiteuren" }
    ) as Promise<Record<string, unknown>[]>,
    columns: [
      { key: "KLANT", header: "Klant" },
      { key: "FACTUURNUMMER", header: "Factuurnummer" },
      { key: "DATUM", header: "Factuurdatum", type: "date" },
      { key: "VERVALDATUM", header: "Vervaldatum", type: "date" },
      { key: "TOTAALBEDRAG", header: "Totaalbedrag", type: "currency" },
      { key: "OPENSTAAND", header: "Openstaand", type: "currency" },
      { key: "DAGEN_OVERDUE", header: "Dagen overdue", type: "number" },
    ],
  },
  "marge-projectleider": {
    title: "Marge per projectleider",
    getMockData: (f, t) => mock.mockRapportMargeProjectleider(f, t) as Record<string, unknown>[],
    getRealData: async (f, t) => {
      const where: string[] = [];
      const params: unknown[] = [];
      if (f) { where.push("p.STARTDATUM >= ?"); params.push(f); }
      if (t) { where.push("p.STARTDATUM <= ?"); params.push(t); }
      return executeQuery(
        `SELECT p.PROJECTLEIDER, COUNT(p.ID) AS PROJECTEN, COALESCE(SUM(omz.OMZET), 0) AS OMZET, COALESCE(SUM(kst.KOSTEN), 0) AS KOSTEN, COALESCE(SUM(omz.OMZET), 0) - COALESCE(SUM(kst.KOSTEN), 0) AS MARGE FROM AT_PROJECTEN p LEFT JOIN (SELECT PROJECT_ID, SUM(BEDRAG_EXCL) AS OMZET FROM AT_KLNTBREG GROUP BY PROJECT_ID) omz ON omz.PROJECT_ID = p.ID LEFT JOIN (SELECT PROJECT_ID, SUM(BEDRAG_EXCL) AS KOSTEN FROM AT_INKOOPFACTUREN GROUP BY PROJECT_ID) kst ON kst.PROJECT_ID = p.ID ${where.length ? "WHERE " + where.join(" AND ") : ""} GROUP BY p.PROJECTLEIDER ORDER BY 5 DESC`,
        params, { tag: "reports.marge" }
      ) as Promise<Record<string, unknown>[]>;
    },
    columns: [
      { key: "PROJECTLEIDER", header: "Projectleider" },
      { key: "PROJECTEN", header: "Aantal projecten", type: "number" },
      { key: "OMZET", header: "Omzet", type: "currency" },
      { key: "KOSTEN", header: "Kosten", type: "currency" },
      { key: "MARGE", header: "Marge", type: "currency" },
    ],
  },
  "inkoop-kostensoort": {
    title: "Inkoop per kostensoort",
    getMockData: (f, t) => mock.mockRapportInkoopKostensoort(f, t) as Record<string, unknown>[],
    getRealData: async (f, t) => {
      const where: string[] = [];
      const params: unknown[] = [];
      if (f) { where.push("i.DATUM >= ?"); params.push(f); }
      if (t) { where.push("i.DATUM <= ?"); params.push(t); }
      return executeQuery(
        `SELECT ks.OMSCHRIJVING AS KOSTENSOORT, COUNT(i.ID) AS FACTUREN, COALESCE(SUM(i.BEDRAG_EXCL), 0) AS BEDRAG_EXCL, COALESCE(SUM(i.BTW), 0) AS BTW, COALESCE(SUM(i.TOTAALBEDRAG), 0) AS TOTAAL FROM AT_INKOOPFACTUREN i LEFT JOIN AT_KOSTENSOORT ks ON ks.ID = i.KOSTENSOORT_ID ${where.length ? "WHERE " + where.join(" AND ") : ""} GROUP BY ks.OMSCHRIJVING ORDER BY 3 DESC`,
        params, { tag: "reports.inkoop" }
      ) as Promise<Record<string, unknown>[]>;
    },
    columns: [
      { key: "KOSTENSOORT", header: "Kostensoort" },
      { key: "FACTUREN", header: "Aantal facturen", type: "number" },
      { key: "BEDRAG_EXCL", header: "Bedrag excl. BTW", type: "currency" },
      { key: "BTW", header: "BTW", type: "currency" },
      { key: "TOTAAL", header: "Totaal", type: "currency" },
    ],
  },
};

export async function reportRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  app.get("/api/v1/rapportages", async () =>
    Object.entries(REPORT_DEFINITIONS).map(([key, def]) => ({ id: key, title: def.title }))
  );

  app.get("/api/v1/rapportages/export", async (request, reply) => {
    const parse = reportSchema.safeParse(request.query);
    if (!parse.success) return reply.code(400).send({ error: parse.error.flatten() });

    const { type, dateFrom, dateTo, format } = parse.data;
    const def = REPORT_DEFINITIONS[type];
    if (!def) return reply.code(404).send({ error: "Rapport niet gevonden" });

    const data = env.MOCK_MODE
      ? def.getMockData(dateFrom, dateTo)
      : await def.getRealData(dateFrom, dateTo);

    if (format === "xlsx") {
      const buffer = await generateExcel(def.title, def.columns, data);
      return reply
        .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        .header("Content-Disposition", `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.xlsx"`)
        .send(buffer);
    }

    return { report: type, title: def.title, generatedAt: new Date().toISOString(), data };
  });
}

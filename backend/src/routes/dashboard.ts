import type { FastifyInstance } from "fastify";
import { executeQuery, executeQueryOne } from "../db/query.js";
import { authMiddleware } from "../middleware/auth.js";
import { env } from "../config.js";
import * as mock from "../mock/handlers.js";

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  app.get("/api/v1/dashboard/kpis", async () => {
    if (env.MOCK_MODE) return mock.mockDashboardKpis();

    const [omzetMonth, omzetYear, openProjects, openWerkbonnen, openDebiteuren] =
      await Promise.allSettled([
        executeQueryOne(`SELECT COALESCE(SUM(d.BEDRAG_EXCL), 0) AS OMZET FROM AT_KLNTBREG k JOIN AT_DOCUMENT d ON d.BREG_ID = k.ID WHERE EXTRACT(YEAR FROM k.DATUM) = EXTRACT(YEAR FROM CURRENT_DATE) AND EXTRACT(MONTH FROM k.DATUM) = EXTRACT(MONTH FROM CURRENT_DATE)`, [], { tag: "dashboard.omzet-month" }),
        executeQueryOne(`SELECT COALESCE(SUM(d.BEDRAG_EXCL), 0) AS OMZET FROM AT_KLNTBREG k JOIN AT_DOCUMENT d ON d.BREG_ID = k.ID WHERE EXTRACT(YEAR FROM k.DATUM) = EXTRACT(YEAR FROM CURRENT_DATE)`, [], { tag: "dashboard.omzet-year" }),
        executeQueryOne(`SELECT COUNT(*) AS CNT FROM AT_WERK WHERE ACTIEF = 'J'`, [], { tag: "dashboard.open-projects" }),
        executeQueryOne(`SELECT COUNT(*) AS CNT FROM AT_WERKBONNEN WHERE STATUS NOT IN ('AFGEROND', 'GEFACTUREERD')`, [], { tag: "dashboard.open-werkbonnen" }),
        executeQueryOne(`SELECT COALESCE(SUM(k.OPENSTAAND), 0) AS BEDRAG FROM AT_KLNTBREG k WHERE k.OPENSTAAND > 0`, [], { tag: "dashboard.open-debiteuren" }),
      ]);

    return {
      omzetDezeMonth: omzetMonth.status === "fulfilled" ? omzetMonth.value : null,
      omzetDitJaar:   omzetYear.status === "fulfilled"  ? omzetYear.value  : null,
      openProjecten:  openProjects.status === "fulfilled" ? openProjects.value : null,
      openWerkbonnen: openWerkbonnen.status === "fulfilled" ? openWerkbonnen.value : null,
      openDebiteuren: openDebiteuren.status === "fulfilled" ? openDebiteuren.value : null,
    };
  });

  app.get("/api/v1/dashboard/omzet-per-maand", async () => {
    if (env.MOCK_MODE) return mock.mockOmzetPerMaand();
    return executeQuery(
      `SELECT EXTRACT(YEAR FROM k.DATUM) AS JAAR, EXTRACT(MONTH FROM k.DATUM) AS MAAND, COALESCE(SUM(d.BEDRAG_EXCL), 0) AS OMZET FROM AT_KLNTBREG k JOIN AT_DOCUMENT d ON d.BREG_ID = k.ID WHERE k.DATUM >= DATEADD(-12 MONTH TO CURRENT_DATE) GROUP BY 1, 2 ORDER BY 1, 2`,
      [], { tag: "dashboard.omzet-per-maand" }
    );
  });

  app.get("/api/v1/dashboard/top-klanten", async () => {
    if (env.MOCK_MODE) return mock.mockTopKlanten();
    return executeQuery(
      `SELECT FIRST 10 kl.NAAM AS KLANT, COALESCE(SUM(d.BEDRAG_EXCL), 0) AS OMZET FROM AT_KLNTBREG k JOIN AT_DOCUMENT d ON d.BREG_ID = k.ID JOIN AT_KLANTEN kl ON kl.ID = k.KLANT_ID WHERE EXTRACT(YEAR FROM k.DATUM) = EXTRACT(YEAR FROM CURRENT_DATE) GROUP BY kl.NAAM ORDER BY 2 DESC`,
      [], { tag: "dashboard.top-klanten" }
    );
  });

  app.get("/api/v1/dashboard/recente-werkbonnen", async () => {
    if (env.MOCK_MODE) return mock.mockRecenteWerkbonnen();
    return executeQuery(
      `SELECT FIRST 10 w.BONNUMMER, w.OMSCHRIJVING, w.DATUM, w.STATUS, kl.NAAM AS KLANT FROM AT_WERKBONNEN w LEFT JOIN AT_KLANTEN kl ON kl.ID = w.KLANT_ID ORDER BY w.DATUM DESC`,
      [], { tag: "dashboard.recente-werkbonnen" }
    );
  });

  // ─── Uren (AT_URENBREG) ──────────────────────────────────────────────────────
  app.get("/api/v1/dashboard/uren-stats", async () => {
    if (env.MOCK_MODE) return mock.mockDashboardUrenStats();
    return executeQueryOne(
      `SELECT
         SUM(CASE WHEN u.DATUM >= DATEADD(-7 DAY TO CURRENT_DATE) THEN u.AANTAL ELSE 0 END) AS UREN_DEZE_WEEK,
         SUM(CASE WHEN EXTRACT(MONTH FROM u.DATUM) = EXTRACT(MONTH FROM CURRENT_DATE)
                   AND EXTRACT(YEAR FROM u.DATUM) = EXTRACT(YEAR FROM CURRENT_DATE) THEN u.AANTAL ELSE 0 END) AS UREN_DEZE_MAAND,
         COUNT(DISTINCT CASE WHEN EXTRACT(MONTH FROM u.DATUM) = EXTRACT(MONTH FROM CURRENT_DATE) THEN u.MEDEW_GC_ID END) AS ACTIEVE_MEDEWERKERS
       FROM AT_URENBREG u`,
      [], { tag: "dashboard.uren-stats" }
    );
  });

  app.get("/api/v1/dashboard/uren-per-dag", async () => {
    if (env.MOCK_MODE) return mock.mockUrenPerWeek();
    return executeQuery(
      `SELECT u.DATUM, SUM(u.AANTAL) AS UREN FROM AT_URENBREG u WHERE u.DATUM >= DATEADD(-14 DAY TO CURRENT_DATE) GROUP BY u.DATUM ORDER BY u.DATUM`,
      [], { tag: "dashboard.uren-per-dag" }
    );
  });

  app.get("/api/v1/dashboard/uren-per-medewerker", async () => {
    if (env.MOCK_MODE) return mock.mockUrenPerMedewerker();
    return executeQuery(
      `SELECT m.GC_OMSCHRIJVING AS NAAM, SUM(u.AANTAL) AS UREN FROM AT_URENBREG u JOIN AT_MEDEW m ON m.GC_ID = u.MEDEW_GC_ID WHERE EXTRACT(MONTH FROM u.DATUM) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM u.DATUM) = EXTRACT(YEAR FROM CURRENT_DATE) GROUP BY m.GC_OMSCHRIJVING ORDER BY 2 DESC`,
      [], { tag: "dashboard.uren-per-medewerker" }
    );
  });

  app.get("/api/v1/dashboard/uren-per-project", async () => {
    if (env.MOCK_MODE) return mock.mockUrenPerProject();
    return executeQuery(
      `SELECT FIRST 8 w.GC_CODE AS PROJECT, w.GC_OMSCHRIJVING AS NAAM, SUM(u.AANTAL) AS UREN FROM AT_URENBREG u JOIN AT_WERK w ON w.GC_ID = u.WERK_GC_ID WHERE EXTRACT(MONTH FROM u.DATUM) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM u.DATUM) = EXTRACT(YEAR FROM CURRENT_DATE) GROUP BY w.GC_CODE, w.GC_OMSCHRIJVING ORDER BY 3 DESC`,
      [], { tag: "dashboard.uren-per-project" }
    );
  });

  app.get("/api/v1/dashboard/recente-uren", async () => {
    if (env.MOCK_MODE) return mock.mockRecenteUren();
    return executeQuery(
      `SELECT FIRST 15 u.DATUM, m.GC_OMSCHRIJVING AS MEDEWERKER, m.GC_CODE, w.GC_CODE AS WERK_CODE, w.GC_OMSCHRIJVING AS WERK_NAAM, t.GC_OMSCHRIJVING AS TAAK, u.AANTAL, u.GC_OMSCHRIJVING AS OMSCHRIJVING FROM AT_URENBREG u JOIN AT_MEDEW m ON m.GC_ID = u.MEDEW_GC_ID JOIN AT_WERK w ON w.GC_ID = u.WERK_GC_ID LEFT JOIN AT_TAAK t ON t.GC_ID = u.TAAK_GC_ID ORDER BY u.DATUM DESC`,
      [], { tag: "dashboard.recente-uren" }
    );
  });

  app.get("/api/v1/dashboard/medewerkers", async () => {
    if (env.MOCK_MODE) return mock.mockMedewerkers();
    return executeQuery(
      `SELECT m.GC_ID AS ID, m.GC_CODE, m.GC_OMSCHRIJVING AS NAAM, f.GC_OMSCHRIJVING AS FUNCTIE FROM AT_MEDEW m LEFT JOIN AT_FUNCTIE f ON f.GC_ID = m.FUNCTIE_GC_ID WHERE m.ACTIEF_JN = 'J' ORDER BY m.GC_OMSCHRIJVING`,
      [], { tag: "dashboard.medewerkers" }
    );
  });
}

import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getElmarProjecten } from "@/lib/mock/elmar-data";
import type { Database } from "@prisma/client";

const ALL_DATABASES = ["SERVICES", "MAINTENANCE", "INTERNATIONAL", "KEYSER"] as const;

const DB_LABELS: Record<string, string> = {
  SERVICES:      "Elmar Services",
  MAINTENANCE:   "Elmar Maintenance",
  INTERNATIONAL: "Elmar International",
  KEYSER:        "Keyser",
};

const DEFAULT_UREN_TARIEF: Record<string, number> = {
  SERVICES:      7.5,
  INTERNATIONAL: 7.5,
  MAINTENANCE:   7.5,
  KEYSER:        10,
};
const DEFAULT_ALG_KOSTEN_PCT = 5;

function r2(n: number) { return Math.round(n * 100) / 100; }

function emptyStats() {
  return {
    aanneemsom: 0, gefactureerd: 0,
    totaleKosten: 0, brutomarge: 0,
    actief: 0, totaal: 0,
    nietGefactureerd: 0,
    directeKosten: 0, pakbonKosten: 0, indirecteKosten: 0, algemeenKosten: 0,
  };
}

function statusWhere(statusFilter: string): { status?: string } {
  if (statusFilter === "actueel")   return { status: "ACTIEF" };
  if (statusFilter === "historisch") return { status: "HISTORISCH" };
  return {};
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  if (session.role !== "MGM" && session.role !== "ADMIN") {
    return Response.json({ error: "Geen toegang — management-rol vereist" }, { status: 403 });
  }

  const s             = request.nextUrl.searchParams;
  const statusFilter  = s.get("status") ?? "alle";
  const databaseParam = s.get("database") ?? "ALL";

  const databases = databaseParam === "ALL"
    ? [...ALL_DATABASES]
    : ALL_DATABASES.filter(d => d === databaseParam);

  const perDatabase = await Promise.all(databases.map(async (database) => {
    const stats = emptyStats();
    let source: "read-model" | "mock" | "not-connected" = "mock";

    // ── KEYSER: check of env-vars zijn gezet ──────────────────────────────────
    if (database === "KEYSER") {
      const rmCount = await db.rmProjectSummary.count({
        where: { database: "KEYSER", aanneemsom: { gte: 0 } },
      }).catch(() => 0);

      if (rmCount === 0) {
        source = "not-connected";
        return {
          database, label: DB_LABELS[database],
          aanneemsom: 0, gefactureerd: 0, totaleKosten: 0, brutomarge: 0,
          margePct: 0, nietGefactureerd: 0, nietGefactureerdPct: 0,
          actief: 0, totaal: 0, source,
          directeKosten: 0, pakbonKosten: 0, indirecteKosten: 0, algemeenKosten: 0,
        };
      }

      source = "read-model";
      const whereStatus = statusWhere(statusFilter);
      const rows = await db.rmProjectSummary.findMany({
        where: { database: "KEYSER", aanneemsom: { gte: 0 }, ...whereStatus },
      });
      const codes = rows.map(r => r.projectNr);
      const inputs = await db.projectInput.findMany({
        where: { database: "KEYSER", projectCode: { in: codes } },
      });
      const inputMap = new Map(inputs.map(i => [i.projectCode, i]));

      for (const row of rows) {
        const ns    = Number(row.aanneemsom) || 0;
        const gef   = Number(row.gefactureerd) || 0;
        const dirk  = (Number(row.kostenMateriaal) || 0) + (Number(row.kostenArbeid) || 0) + (Number(row.kostenOverig) || 0);
        const pbk   = Number(row.kostenPakbon) || 0;
        const uren  = Number(row.urenTotaal) || 0;
        const inp   = inputMap.get(row.projectNr);
        const urenTarief   = Number(inp?.urenTarief   ?? DEFAULT_UREN_TARIEF["KEYSER"]);
        const algKostenPct = Number(inp?.algKostenPct ?? DEFAULT_ALG_KOSTEN_PCT);
        const indir = uren * urenTarief;
        const alg   = ns * (algKostenPct / 100);
        stats.directeKosten   += dirk;
        stats.pakbonKosten    += pbk;
        stats.indirecteKosten += indir;
        stats.algemeenKosten  += alg;
        stats.aanneemsom      += ns;
        stats.gefactureerd    += gef;
        stats.totaleKosten    += dirk + pbk + indir + alg;
        stats.brutomarge      += gef - (dirk + pbk + indir + alg);
        stats.actief          += row.status === "ACTIEF" ? 1 : 0;
        stats.totaal++;
      }

      stats.nietGefactureerd = stats.aanneemsom - stats.gefactureerd;
      return {
        database, label: DB_LABELS[database], source,
        aanneemsom:          r2(stats.aanneemsom),
        gefactureerd:        r2(stats.gefactureerd),
        totaleKosten:        r2(stats.totaleKosten),
        brutomarge:          r2(stats.brutomarge),
        margePct:            r2(stats.gefactureerd > 0 ? stats.brutomarge / stats.gefactureerd * 100 : 0),
        nietGefactureerd:    r2(stats.nietGefactureerd),
        nietGefactureerdPct: r2(stats.aanneemsom > 0 ? stats.nietGefactureerd / stats.aanneemsom * 100 : 0),
        actief:              stats.actief,
        totaal:              stats.totaal,
        directeKosten:       r2(stats.directeKosten),
        pakbonKosten:        r2(stats.pakbonKosten),
        indirecteKosten:     r2(stats.indirecteKosten),
        algemeenKosten:      r2(stats.algemeenKosten),
      };
    }

    // ── ALL PROJECT-TYPE DATABASES (SERVICES / MAINTENANCE / INTERNATIONAL) ───
    const rmCount = await db.rmProjectSummary.count({
      where: { database: database as Database, aanneemsom: { gte: 0 } },
    }).catch(() => 0);

    if (rmCount > 0) {
      source = "read-model";
      const whereStatus = statusWhere(statusFilter);
      const rows = await db.rmProjectSummary.findMany({
        where: { database: database as Database, aanneemsom: { gte: 0 }, ...whereStatus },
      });
      const codes = rows.map(r => r.projectNr);
      const inputs = await db.projectInput.findMany({
        where: { database: database as Database, projectCode: { in: codes } },
      });
      const inputMap = new Map(inputs.map(i => [i.projectCode, i]));

      for (const row of rows) {
        const ns    = Number(row.aanneemsom) || 0;
        const gef   = Number(row.gefactureerd) || 0;
        const dirk  = (Number(row.kostenMateriaal) || 0) + (Number(row.kostenArbeid) || 0) + (Number(row.kostenOverig) || 0);
        const pbk   = Number(row.kostenPakbon) || 0;
        const uren  = Number(row.urenTotaal) || 0;
        const inp   = inputMap.get(row.projectNr);
        const urenTarief   = Number(inp?.urenTarief   ?? (DEFAULT_UREN_TARIEF[database] ?? 7.5));
        const algKostenPct = Number(inp?.algKostenPct ?? DEFAULT_ALG_KOSTEN_PCT);
        const indir = uren * urenTarief;
        const alg   = ns * (algKostenPct / 100);
        stats.directeKosten   += dirk;
        stats.pakbonKosten    += pbk;
        stats.indirecteKosten += indir;
        stats.algemeenKosten  += alg;
        stats.aanneemsom      += ns;
        stats.gefactureerd    += gef;
        stats.totaleKosten    += dirk + pbk + indir + alg;
        stats.brutomarge      += gef - (dirk + pbk + indir + alg);
        stats.actief          += row.status === "ACTIEF" ? 1 : 0;
        stats.totaal++;
      }
    } else {
      // Mock fallback
      let mockProjecten = getElmarProjecten(database);
      if (statusFilter === "actueel")    mockProjecten = mockProjecten.filter(p => p.STATUS === "ACTIEF");
      if (statusFilter === "historisch") mockProjecten = mockProjecten.filter(p => (p.STATUS as string) === "HISTORISCH");
      for (const p of mockProjecten) {
        stats.aanneemsom   += p.TOTAAL_AANNEEMSOM;
        stats.gefactureerd += p.GEFACTUREERD_TOTAAL;
        stats.totaleKosten += p.TOTALE_KOSTEN;
        stats.brutomarge   += p.BRUTOMARGE;
        stats.actief       += p.STATUS === "ACTIEF" ? 1 : 0;
        stats.totaal++;
      }
    }

    stats.nietGefactureerd = stats.aanneemsom - stats.gefactureerd;
    return {
      database, label: DB_LABELS[database], source,
      aanneemsom:          r2(stats.aanneemsom),
      gefactureerd:        r2(stats.gefactureerd),
      totaleKosten:        r2(stats.totaleKosten),
      brutomarge:          r2(stats.brutomarge),
      margePct:            r2(stats.gefactureerd > 0 ? stats.brutomarge / stats.gefactureerd * 100 : 0),
      nietGefactureerd:    r2(stats.nietGefactureerd),
      nietGefactureerdPct: r2(stats.aanneemsom > 0 ? stats.nietGefactureerd / stats.aanneemsom * 100 : 0),
      actief:              stats.actief,
      totaal:              stats.totaal,
      directeKosten:       r2(stats.directeKosten),
      pakbonKosten:        r2(stats.pakbonKosten),
      indirecteKosten:     r2(stats.indirecteKosten),
      algemeenKosten:      r2(stats.algemeenKosten),
    };
  }));

  // Consolidated totals — not-connected databases tellen niet mee
  const connectedDbs = perDatabase.filter(d => d.source !== "not-connected");
  const totaal = connectedDbs.reduce(
    (acc, d) => ({
      aanneemsom:       acc.aanneemsom       + d.aanneemsom,
      gefactureerd:     acc.gefactureerd     + d.gefactureerd,
      totaleKosten:     acc.totaleKosten     + d.totaleKosten,
      brutomarge:       acc.brutomarge       + d.brutomarge,
      actief:           acc.actief           + d.actief,
      totaal:           acc.totaal           + d.totaal,
      nietGefactureerd: acc.nietGefactureerd + d.nietGefactureerd,
      directeKosten:    acc.directeKosten    + d.directeKosten,
      pakbonKosten:     acc.pakbonKosten     + d.pakbonKosten,
      indirecteKosten:  acc.indirecteKosten  + d.indirecteKosten,
      algemeenKosten:   acc.algemeenKosten   + d.algemeenKosten,
    }),
    { aanneemsom: 0, gefactureerd: 0, totaleKosten: 0, brutomarge: 0, actief: 0, totaal: 0, nietGefactureerd: 0, directeKosten: 0, pakbonKosten: 0, indirecteKosten: 0, algemeenKosten: 0 }
  );

  return Response.json({
    filters: { status: statusFilter, database: databaseParam },
    perDatabase,
    totaal: {
      ...totaal,
      margePct:            r2(totaal.gefactureerd > 0 ? totaal.brutomarge / totaal.gefactureerd * 100 : 0),
      nietGefactureerdPct: r2(totaal.aanneemsom   > 0 ? totaal.nietGefactureerd / totaal.aanneemsom * 100 : 0),
      aanneemsom:          r2(totaal.aanneemsom),
      gefactureerd:        r2(totaal.gefactureerd),
      totaleKosten:        r2(totaal.totaleKosten),
      brutomarge:          r2(totaal.brutomarge),
      nietGefactureerd:    r2(totaal.nietGefactureerd),
    },
  });
}

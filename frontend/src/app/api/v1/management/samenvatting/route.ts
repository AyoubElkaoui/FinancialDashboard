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

function computeFinancials(
  aanneemsom: number,
  gefactureerd: number,
  kostenSyntess: number,
  urenTotaal: number,
  database: string,
  input?: { urenTarief: number | null; algKostenPct: number | null } | null
) {
  const urenTarief    = input?.urenTarief    ?? (DEFAULT_UREN_TARIEF[database] ?? 7.5);
  const algKostenPct  = input?.algKostenPct  ?? DEFAULT_ALG_KOSTEN_PCT;
  const kostenIndirect = urenTotaal * urenTarief;
  const kostenAlgemeen = aanneemsom * (algKostenPct / 100);
  const totaleKosten   = kostenSyntess + kostenIndirect + kostenAlgemeen;
  const brutomarge     = gefactureerd - totaleKosten;
  const margePct       = totaleKosten > 0 ? brutomarge / totaleKosten * 100 : 0;
  const nietGefactureerd    = aanneemsom - gefactureerd;
  const nietGefactureerdPct = aanneemsom > 0 ? nietGefactureerd / aanneemsom * 100 : 0;
  return { totaleKosten, brutomarge, margePct, nietGefactureerd, nietGefactureerdPct };
}

function emptyStats() {
  return { aanneemsom: 0, gefactureerd: 0, totaleKosten: 0, brutomarge: 0, actief: 0, totaal: 0, nietGefactureerd: 0 };
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });
  if (session.role !== "MGM" && session.role !== "ADMIN") {
    return Response.json({ error: "Geen toegang — management-rol vereist" }, { status: 403 });
  }

  const s             = request.nextUrl.searchParams;
  const statusFilter  = s.get("status") ?? "actueel";   // actueel | historisch
  const databaseParam = s.get("database") ?? "ALL";

  const databases = databaseParam === "ALL"
    ? [...ALL_DATABASES]
    : ALL_DATABASES.filter(d => d === databaseParam);

  const perDatabase = await Promise.all(databases.map(async (database) => {
    const stats = emptyStats();
    let source: "read-model" | "mock" = "mock";

    // MAINTENANCE heeft geen rm_project_summary (werkbon-type) — altijd mock
    const rmCount = database !== "MAINTENANCE"
      ? await db.rmProjectSummary.count({
          where: { database: database as Database, aanneemsom: { gte: 0 } },
        }).catch(() => 0)
      : 0;

    if (rmCount > 0) {
      source = "read-model";
      const whereStatus = statusFilter === "actueel" ? { status: "ACTIEF" } : {};
      const rows = await db.rmProjectSummary.findMany({
        where: { database: database as Database, aanneemsom: { gte: 0 }, ...whereStatus },
      });
      const codes = rows.map(r => r.projectNr);
      const inputs = await db.projectInput.findMany({
        where: { database: database as Database, projectCode: { in: codes } },
      });
      const inputMap = new Map(inputs.map(i => [i.projectCode, i]));

      for (const row of rows) {
        const ns   = Number(row.aanneemsom)    || 0;
        const gef  = Number(row.gefactureerd)  || 0;
        const ks   = (Number(row.kostenMateriaal) || 0) + (Number(row.kostenArbeid) || 0) + (Number(row.kostenOverig) || 0);
        const uren = Number(row.urenTotaal)    || 0;
        const input = inputMap.get(row.projectNr);
        const calc = computeFinancials(ns, gef, ks, uren, database, input);

        stats.aanneemsom    += ns;
        stats.gefactureerd  += gef;
        stats.totaleKosten  += calc.totaleKosten;
        stats.brutomarge    += calc.brutomarge;
        stats.actief        += row.status === "ACTIEF" ? 1 : 0;
        stats.totaal++;
      }
    } else {
      // Mock fallback
      let mockProjecten = getElmarProjecten(database);
      if (statusFilter === "actueel") mockProjecten = mockProjecten.filter(p => p.STATUS === "ACTIEF");

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
    const margePct             = stats.totaleKosten > 0 ? stats.brutomarge / stats.totaleKosten * 100 : 0;
    const nietGefactureerdPct  = stats.aanneemsom > 0 ? stats.nietGefactureerd / stats.aanneemsom * 100 : 0;

    return {
      database,
      label:               DB_LABELS[database],
      aanneemsom:          r2(stats.aanneemsom),
      gefactureerd:        r2(stats.gefactureerd),
      totaleKosten:        r2(stats.totaleKosten),
      brutomarge:          r2(stats.brutomarge),
      margePct:            r2(margePct),
      nietGefactureerd:    r2(stats.nietGefactureerd),
      nietGefactureerdPct: r2(nietGefactureerdPct),
      actief:              stats.actief,
      totaal:              stats.totaal,
      source,
    };
  }));

  // Consolidated totals
  const totaal = perDatabase.reduce(
    (acc, d) => ({
      aanneemsom:       acc.aanneemsom       + d.aanneemsom,
      gefactureerd:     acc.gefactureerd     + d.gefactureerd,
      totaleKosten:     acc.totaleKosten     + d.totaleKosten,
      brutomarge:       acc.brutomarge       + d.brutomarge,
      actief:           acc.actief           + d.actief,
      totaal:           acc.totaal           + d.totaal,
      nietGefactureerd: acc.nietGefactureerd + d.nietGefactureerd,
    }),
    { aanneemsom: 0, gefactureerd: 0, totaleKosten: 0, brutomarge: 0, actief: 0, totaal: 0, nietGefactureerd: 0 }
  );

  return Response.json({
    filters: { status: statusFilter, database: databaseParam },
    perDatabase,
    totaal: {
      ...totaal,
      margePct:            r2(totaal.totaleKosten > 0 ? totaal.brutomarge / totaal.totaleKosten * 100 : 0),
      nietGefactureerdPct: r2(totaal.aanneemsom   > 0 ? totaal.nietGefactureerd / totaal.aanneemsom * 100 : 0),
      aanneemsom:          r2(totaal.aanneemsom),
      gefactureerd:        r2(totaal.gefactureerd),
      totaleKosten:        r2(totaal.totaleKosten),
      brutomarge:          r2(totaal.brutomarge),
      nietGefactureerd:    r2(totaal.nietGefactureerd),
    },
  });
}

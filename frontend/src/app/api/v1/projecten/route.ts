import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getElmarProjecten } from "@/lib/mock/elmar-data";
import type { Database } from "@prisma/client";

const PROJECT_DATABASES = ["SERVICES", "INTERNATIONAL"] as const;
const DEFAULT_UREN_TARIEF = 7.5;

function applyParams(row: {
  aanneemsom: unknown; gefactureerd: unknown;
  kostenMateriaal: unknown; kostenArbeid: unknown; kostenOverig: unknown; urenTotaal: unknown;
}, input?: { urenTarief: number | null; algKostenPct: number | null } | null) {
  const aanneemsom    = Number(row.aanneemsom)    || 0;
  const gefactureerd  = Number(row.gefactureerd)  || 0;
  const urenTarief    = input?.urenTarief    ?? DEFAULT_UREN_TARIEF;
  const algKostenPct  = input?.algKostenPct  ?? 0;
  const kostenSyntess = (Number(row.kostenMateriaal) || 0)
                      + (Number(row.kostenArbeid)    || 0)
                      + (Number(row.kostenOverig)    || 0);
  const kostenIndirect = (Number(row.urenTotaal) || 0) * urenTarief;
  const kostenAlgemeen = kostenSyntess * (algKostenPct / 100);
  const totaleKosten   = kostenSyntess + kostenIndirect + kostenAlgemeen;
  const brutomarge     = gefactureerd - totaleKosten;
  const margePct   = gefactureerd > 0 ? (brutomarge / gefactureerd) * 100 : 0;
  // aanneemsom = 0 → pctBetaald = null (frontend toont "n.v.t.")
  const pctBetaald = aanneemsom  > 0 ? (gefactureerd / aanneemsom)  * 100 : null;
  return { aanneemsom, gefactureerd, totaleKosten, brutomarge, margePct, pctBetaald };
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const s        = request.nextUrl.searchParams;
  const database = s.get("database") ?? "SERVICES";
  const search   = s.get("search")?.toLowerCase() ?? "";
  const page     = Math.max(1, Number(s.get("page") ?? 1));
  const pageSize = Math.min(5000, Math.max(1, Number(s.get("pageSize") ?? 100)));

  // Controleer of read-model data heeft voor deze database
  // Systeemprojecten uitsluiten: negatieve aanneemsom = migratiecorrecties
  const rmCount = await db.rmProjectSummary.count({
    where: { database: database as Database, aanneemsom: { gte: 0 } },
  }).catch(() => 0);

  if (rmCount === 0) {
    // Nog niet gesynct — terugvallen op mock
    const all = database === "ALL"
      ? PROJECT_DATABASES.flatMap(db => getElmarProjecten(db))
      : getElmarProjecten(database);
    const filtered = search
      ? all.filter(p =>
          p.NAAM.toLowerCase().includes(search) ||
          p.PROJECTNUMMER.toLowerCase().includes(search) ||
          (p.KLANT ?? "").toLowerCase().includes(search)
        )
      : all;
    return Response.json({
      data: filtered, total: filtered.length,
      page: 1, pageSize: filtered.length, totalPages: 1,
      _source: "mock",
    });
  }

  // Lees uit read-model
  const where = {
    database:    database as Database,
    aanneemsom:  { gte: 0 },   // systeemprojecten (neg aanneemsom) uitsluiten
    ...(search ? {
      OR: [
        { naam:      { contains: search, mode: "insensitive" as const } },
        { projectNr: { contains: search, mode: "insensitive" as const } },
        { klant:     { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const [rows, total] = await Promise.all([
    db.rmProjectSummary.findMany({
      where,
      skip:    (page - 1) * pageSize,
      take:    pageSize,
      orderBy: { projectNr: "asc" },
    }),
    db.rmProjectSummary.count({ where }),
  ]);

  // App-parameters ophalen voor berekeningen
  const projectCodes = rows.map(r => r.projectNr);
  const inputs = await db.projectInput.findMany({
    where: { database: database as Database, projectCode: { in: projectCodes } },
  });
  const inputMap = new Map(inputs.map(i => [i.projectCode, i]));

  const data = rows.map(row => {
    const input  = inputMap.get(row.projectNr);
    const calc   = applyParams(row, input);
    return {
      ID:                 row.projectNr,
      DATABASE:           database,
      PROJECTNUMMER:      row.projectNr,
      NAAM:               row.naam,
      KLANT:              row.klant,
      STATUS:             row.status,
      AANNEEMSOM:         calc.aanneemsom,
      MEERWERK:           0,
      TOTAAL_AANNEEMSOM:  calc.aanneemsom,
      GEFACTUREERD_TOTAAL: calc.gefactureerd,
      PCT_BETAALD:        calc.pctBetaald,
      TOTALE_KOSTEN:      calc.totaleKosten,
      BRUTOMARGE:         calc.brutomarge,
      MARGE_PCT:          calc.margePct,
    };
  });

  return Response.json({
    data, total, page, pageSize,
    totalPages: Math.ceil(total / pageSize),
    _source: "read-model",
  });
}

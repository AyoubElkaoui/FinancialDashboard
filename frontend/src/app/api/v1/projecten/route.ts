import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getElmarProjecten } from "@/lib/mock/elmar-data";
import type { Database } from "@prisma/client";

const PROJECT_DATABASES = ["SERVICES", "INTERNATIONAL"] as const;
const DEFAULT_UREN_TARIEF: Record<string, number> = {
  SERVICES:      7.5,
  INTERNATIONAL: 7.5,
  MAINTENANCE:   7.5,
  KEYSER:        10,
};
const DEFAULT_ALG_KOSTEN_PCT = 5;

// Volgorde: 100 → 300 → 060 → 070 → 400+ en overig
const PROJECT_PREFIX_ORDER = ["100", "300", "060", "070"];

function projectnrGroupKey(nr: string): number {
  const i = PROJECT_PREFIX_ORDER.findIndex(p => nr.startsWith(p));
  return i >= 0 ? i : PROJECT_PREFIX_ORDER.length;
}

function sortByProjectnr<T extends { projectNr: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ga = projectnrGroupKey(a.projectNr);
    const gb = projectnrGroupKey(b.projectNr);
    if (ga !== gb) return ga - gb;
    return a.projectNr.localeCompare(b.projectNr, "nl");
  });
}

function applyParams(row: {
  aanneemsom: unknown; gefactureerd: unknown;
  kostenMateriaal: unknown; kostenArbeid: unknown; kostenOverig: unknown;
  kostenPakbon?: unknown; urenTotaal: unknown;
}, database: string, input?: { urenTarief: number | null; algKostenPct: number | null } | null) {
  const aanneemsom    = Number(row.aanneemsom)    || 0;
  const gefactureerd  = Number(row.gefactureerd)  || 0;
  const urenTarief    = input?.urenTarief    ?? (DEFAULT_UREN_TARIEF[database] ?? 7.5);
  // Alg. kosten grondslag = aanneemsom (incl. meerwerk zodra apart gesynchroniseerd)
  const algKostenPct  = input?.algKostenPct  ?? DEFAULT_ALG_KOSTEN_PCT;
  const kostenSyntess = (Number(row.kostenMateriaal) || 0)
                      + (Number(row.kostenArbeid)    || 0)
                      + (Number(row.kostenOverig)    || 0)
                      + (Number(row.kostenPakbon)    || 0);
  const kostenIndirect = (Number(row.urenTotaal) || 0) * urenTarief;
  const kostenAlgemeen = aanneemsom * (algKostenPct / 100);
  const totaleKosten   = kostenSyntess + kostenIndirect + kostenAlgemeen;
  const brutomarge     = gefactureerd - totaleKosten;
  // KN = totale kosten; marge % = brutomarge ÷ totale kosten × 100
  const margePct   = totaleKosten > 0 ? (brutomarge / totaleKosten) * 100 : 0;
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
  const pageSize = Math.min(5000, Math.max(1, Number(s.get("pageSize") ?? 250)));
  // status: "actueel" → ACTIEF only, "historisch" → HISTORISCH only, alles → geen filter
  const statusParam = s.get("status") ?? "alle";

  // Controleer of read-model data heeft voor deze database
  // Systeemprojecten uitsluiten: negatieve aanneemsom = migratiecorrecties
  const rmCount = await db.rmProjectSummary.count({
    where: { database: database as Database, aanneemsom: { gte: 0 } },
  }).catch(() => 0);

  if (rmCount === 0) {
    // SERVICES: mock-fallback voor ontwikkeling
    // Overige databases: "not-synced" — nooit nepdata tonen (leidt tot 404 op drill-down)
    if (database !== "SERVICES" && database !== "ALL") {
      return Response.json({
        data: [], total: 0, page: 1, pageSize: 0, totalPages: 0,
        _source: "not-synced",
      });
    }
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
    const sorted = [...filtered].sort((a, b) => {
      const ga = projectnrGroupKey(a.PROJECTNUMMER);
      const gb = projectnrGroupKey(b.PROJECTNUMMER);
      if (ga !== gb) return ga - gb;
      return a.PROJECTNUMMER.localeCompare(b.PROJECTNUMMER, "nl");
    });
    return Response.json({
      data: sorted, total: sorted.length,
      page: 1, pageSize: sorted.length, totalPages: 1,
      _source: "mock",
    });
  }

  // Lees uit read-model
  // verbergLeeg=true → verberg projecten zonder enige financiële activiteit
  const verbergLeeg = s.get("verbergLeeg") !== "false";

  const statusFilter = statusParam === "actueel"    ? { status: "ACTIEF" }
                     : statusParam === "historisch" ? { status: "HISTORISCH" }
                     : {};

  const where = {
    database:    database as Database,
    aanneemsom:  { gte: 0 },   // systeemprojecten (neg aanneemsom) uitsluiten
    ...statusFilter,
    ...(verbergLeeg ? {
      OR: [
        { aanneemsom:      { gt: 0 } },
        { gefactureerd:    { gt: 0 } },
        { kostenMateriaal: { gt: 0 } },
        { kostenArbeid:    { gt: 0 } },
        { kostenOverig:    { gt: 0 } },
      ],
    } : {}),
    ...(search ? {
      OR: [
        { naam:      { contains: search, mode: "insensitive" as const } },
        { projectNr: { contains: search, mode: "insensitive" as const } },
        { klant:     { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  // Haal alles op (geen Prisma orderBy — custom groepssortering in geheugen)
  const [rows, total] = await Promise.all([
    db.rmProjectSummary.findMany({ where }),
    db.rmProjectSummary.count({ where }),
  ]);

  // App-parameters ophalen voor berekeningen
  const projectCodes = rows.map(r => r.projectNr);
  const inputs = await db.projectInput.findMany({
    where: { database: database as Database, projectCode: { in: projectCodes } },
  });
  const inputMap = new Map(inputs.map(i => [i.projectCode, i]));

  const rawData = rows.map(row => {
    const input  = inputMap.get(row.projectNr);
    const calc   = applyParams(row, database, input);
    return {
      ID:                 row.projectNr,
      DATABASE:           database,
      PROJECTNUMMER:      row.projectNr,
      NAAM:               row.naam,
      KLANT:              row.klant,
      PROJECTLEIDER:      row.projectleider ?? "",
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

  // Sorteer op projectnummer-reeksgroep (100→300→060→070→400+), daarna pagineren
  const sorted = sortByProjectnr(rawData.map(r => ({ ...r, projectNr: r.PROJECTNUMMER })))
    .map(r => { const { projectNr: _, ...rest } = r; return rest; });
  const data = sorted.slice((page - 1) * pageSize, page * pageSize);

  return Response.json({
    data, total, page, pageSize,
    totalPages: Math.ceil(total / pageSize),
    _source: "read-model",
  });
}

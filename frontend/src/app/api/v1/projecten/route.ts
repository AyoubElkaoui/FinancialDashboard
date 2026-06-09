import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { Database } from "@prisma/client";

const DEFAULT_UREN_TARIEF: Record<string, number> = {
  SERVICES:      7.5,
  INTERNATIONAL: 7.5,
  MAINTENANCE:   7.5,
  KEYSER:        10,
};
const DEFAULT_ALG_KOSTEN_PCT = 5;

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
  aanneemsom: unknown; gefactureerd: unknown; nogTeFactureren: unknown;
  kostenMateriaal: unknown; kostenArbeid: unknown; kostenOverig: unknown;
  kostenPakbon?: unknown; urenTotaal: unknown;
  kostenACateg: unknown; kostenMCateg: unknown; kostenOCateg: unknown;
}, database: string, input?: { urenTarief: number | null; algKostenPct: number | null } | null) {
  const aanneemsom      = Number(row.aanneemsom)    || 0;
  const gefactureerd    = Number(row.gefactureerd)  || 0;
  const nogTeFactureren = Number(row.nogTeFactureren) || 0;
  const urenTarief      = input?.urenTarief    ?? (DEFAULT_UREN_TARIEF[database] ?? 7.5);
  const algKostenPct    = input?.algKostenPct  ?? DEFAULT_ALG_KOSTEN_PCT;

  // Gebruik AV_KOSTREG_2 categorietotalen als beschikbaar, anders journaal-based
  const kostenACateg = Number(row.kostenACateg) || 0;
  const kostenMCateg = Number(row.kostenMCateg) || 0;
  const kostenOCateg = Number(row.kostenOCateg) || 0;
  const heeftCateg   = (kostenACateg + kostenMCateg + kostenOCateg) > 0;

  const kostenDirect = heeftCateg
    ? kostenACateg + kostenMCateg + kostenOCateg
    : (Number(row.kostenMateriaal) || 0) + (Number(row.kostenArbeid) || 0) + (Number(row.kostenOverig) || 0);

  const kostenPakbon   = Number(row.kostenPakbon)  || 0;
  const kostenIndirect = (Number(row.urenTotaal)   || 0) * urenTarief;
  const kostenAlgemeen = aanneemsom * (algKostenPct / 100);
  const totaleKosten   = kostenDirect + kostenPakbon + kostenIndirect + kostenAlgemeen;
  const brutomarge     = gefactureerd - totaleKosten;
  // Marge % = brutomarge ÷ gefactureerde omzet (niet ÷ kosten)
  const margePct       = gefactureerd > 0 ? (brutomarge / gefactureerd) * 100 : 0;
  const pctGefact      = aanneemsom  > 0 ? (gefactureerd / aanneemsom)  * 100 : null;
  return {
    aanneemsom, gefactureerd, nogTeFactureren, totaleKosten, brutomarge, margePct, pctGefact,
    kostenACateg, kostenMCateg, kostenOCateg,
  };
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const s           = request.nextUrl.searchParams;
  const database    = s.get("database") ?? "SERVICES";
  const search      = s.get("search") ?? "";
  const page        = Math.max(1, Number(s.get("page") ?? 1));
  const pageSize    = Math.min(5000, Math.max(1, Number(s.get("pageSize") ?? 250)));
  const statusParam = s.get("status") ?? "alle";
  const verbergLeeg = s.get("verbergLeeg") !== "false";

  // ─── Controleer of database gesynchroniseerd is ───────────────────────────
  const rmCount = await db.rmProjectSummary.count({
    where: { database: database as Database },
  }).catch(() => 0);

  if (rmCount === 0) {
    return Response.json({
      data: [], total: 0, page: 1, pageSize: 0, totalPages: 0,
      _source: "not-synced",
    });
  }

  const statusFilter = statusParam === "actueel"    ? { status: "ACTIEF" }
                     : statusParam === "historisch" ? { status: "HISTORISCH" }
                     : {};

  // Bouw WHERE op met AND-array om dual-OR bug te vermijden
  const andClauses: object[] = [];

  if (verbergLeeg) {
    andClauses.push({
      OR: [
        { aanneemsom:   { gt: 0 } },
        { gefactureerd: { gt: 0 } },
        { kostenACateg: { gt: 0 } },
        { kostenMCateg: { gt: 0 } },
        { kostenOCateg: { gt: 0 } },
        { kostenMateriaal: { gt: 0 } },
        { kostenArbeid:    { gt: 0 } },
        { kostenOverig:    { gt: 0 } },
      ],
    });
  }

  if (search) {
    andClauses.push({
      OR: [
        { naam:          { contains: search, mode: "insensitive" as const } },
        { projectNr:     { contains: search, mode: "insensitive" as const } },
        { klant:         { contains: search, mode: "insensitive" as const } },
        { projectleider: { contains: search, mode: "insensitive" as const } },
      ],
    });
  }

  const where = {
    database: database as Database,
    ...statusFilter,
    ...(andClauses.length > 0 ? { AND: andClauses } : {}),
  };

  const tarief = DEFAULT_UREN_TARIEF[database] ?? 7.5;
  const algPct = DEFAULT_ALG_KOSTEN_PCT / 100;

  const [rows, total, agg] = await Promise.all([
    db.rmProjectSummary.findMany({ where }),
    db.rmProjectSummary.count({ where }),
    db.rmProjectSummary.aggregate({
      where,
      _sum: {
        aanneemsom: true, gefactureerd: true, nogTeFactureren: true,
        kostenMateriaal: true, kostenArbeid: true, kostenOverig: true,
        kostenPakbon: true, urenTotaal: true,
        kostenACateg: true, kostenMCateg: true, kostenOCateg: true,
      },
    }),
  ]);

  const projectCodes = rows.map(r => r.projectNr);
  const inputs = await db.projectInput.findMany({
    where: { database: database as Database, projectCode: { in: projectCodes } },
  });
  const inputMap = new Map(inputs.map(i => [i.projectCode, i]));

  const rawData = rows.map(row => {
    const input = inputMap.get(row.projectNr);
    const calc  = applyParams(row, database, input);
    return {
      ID:                  row.projectNr,
      DATABASE:            database,
      PROJECTNUMMER:       row.projectNr,
      NAAM:                row.naam,
      KLANT:               row.klant,
      PROJECTLEIDER:       row.projectleider ?? "",
      STATUS:              row.status,
      AANNEEMSOM:          calc.aanneemsom,
      MEERWERK:            0,
      TOTAAL_AANNEEMSOM:   calc.aanneemsom,
      GEFACTUREERD_TOTAAL: calc.gefactureerd,
      NOG_TE_FACTUREREN:   calc.nogTeFactureren,
      PCT_GEFACT:          calc.pctGefact,
      PCT_BETAALD:         calc.pctGefact,
      TOTALE_KOSTEN:       calc.totaleKosten,
      BRUTOMARGE:          calc.brutomarge,
      MARGE_PCT:           calc.margePct,
      KOSTEN_A_CATEG:      calc.kostenACateg,
      KOSTEN_M_CATEG:      calc.kostenMCateg,
      KOSTEN_O_CATEG:      calc.kostenOCateg,
      projectNr:           row.projectNr,
    };
  });

  const sorted = sortByProjectnr(rawData)
    .map(r => { const { projectNr: _, ...rest } = r; return rest; });
  const data = sorted.slice((page - 1) * pageSize, page * pageSize);

  // Globale totalen (aggregatie over alle pagina's voor huidige filter)
  const totAanneemsom   = Number(agg._sum.aanneemsom   ?? 0);
  const totGef          = Number(agg._sum.gefactureerd  ?? 0);
  const totNogTeFact    = Number(agg._sum.nogTeFactureren ?? 0);
  const totACateg       = Number(agg._sum.kostenACateg  ?? 0);
  const totMCateg       = Number(agg._sum.kostenMCateg  ?? 0);
  const totOCateg       = Number(agg._sum.kostenOCateg  ?? 0);
  const heeftCateg      = (totACateg + totMCateg + totOCateg) > 0;
  const totKostenDirect = heeftCateg
    ? totACateg + totMCateg + totOCateg
    : Number(agg._sum.kostenMateriaal ?? 0) + Number(agg._sum.kostenArbeid ?? 0) + Number(agg._sum.kostenOverig ?? 0);
  const totKosten = totKostenDirect
    + Number(agg._sum.kostenPakbon ?? 0)
    + Number(agg._sum.urenTotaal ?? 0) * tarief
    + totAanneemsom * algPct;
  const totMarge  = totGef - totKosten;

  return Response.json({
    data, total, page, pageSize,
    totalPages: Math.ceil(total / pageSize),
    _source: "read-model",
    _totals: {
      aanneemsom:     totAanneemsom,
      gefactureerd:   totGef,
      nogTeFactureren: totNogTeFact,
      kosten:         totKosten,
      marge:          totMarge,
      kostenACateg:   totACateg,
      kostenMCateg:   totMCateg,
      kostenOCateg:   totOCateg,
    },
  });
}

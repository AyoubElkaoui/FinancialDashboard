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
  const algKostenPct  = input?.algKostenPct  ?? DEFAULT_ALG_KOSTEN_PCT;
  const kostenSyntess = (Number(row.kostenMateriaal) || 0)
                      + (Number(row.kostenArbeid)    || 0)
                      + (Number(row.kostenOverig)    || 0)
                      + (Number(row.kostenPakbon)    || 0);
  const kostenIndirect = (Number(row.urenTotaal) || 0) * urenTarief;
  const kostenAlgemeen = aanneemsom * (algKostenPct / 100);
  const totaleKosten   = kostenSyntess + kostenIndirect + kostenAlgemeen;
  const brutomarge     = gefactureerd - totaleKosten;
  const margePct   = totaleKosten > 0 ? (brutomarge / totaleKosten) * 100 : 0;
  const pctBetaald = aanneemsom  > 0 ? (gefactureerd / aanneemsom)  * 100 : null;
  return { aanneemsom, gefactureerd, totaleKosten, brutomarge, margePct, pctBetaald };
}

// ─── Werkbon-status → ACTIEF / HISTORISCH ────────────────────────────────────
const WB_STATUS_MAP: Record<string, string> = {
  A: "ACTIEF", I: "ACTIEF", U: "ACTIEF", V: "HISTORISCH",
};

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const s           = request.nextUrl.searchParams;
  const database    = s.get("database") ?? "SERVICES";
  const search      = s.get("search")?.toLowerCase() ?? "";
  const page        = Math.max(1, Number(s.get("page") ?? 1));
  const pageSize    = Math.min(5000, Math.max(1, Number(s.get("pageSize") ?? 250)));
  const statusParam = s.get("status") ?? "alle";
  const verbergLeeg = s.get("verbergLeeg") !== "false";

  // ─── MAINTENANCE: lees uit rm_werkbon ────────────────────────────────────
  if (database === "MAINTENANCE") {
    const wbCount = await db.rmWerkbon.count({ where: { database: "MAINTENANCE" } }).catch(() => 0);
    if (wbCount === 0) {
      return Response.json({
        data: [], total: 0, page: 1, pageSize: 0, totalPages: 0,
        _source: "not-synced",
      });
    }

    const conditions: object[] = [];
    if (statusParam === "actueel")    conditions.push({ status: { in: ["A", "I", "U"] } });
    if (statusParam === "historisch") conditions.push({ status: "V" });
    if (verbergLeeg) {
      conditions.push({ OR: [
        { opbrengsten: { gt: 0 } },
        { urenWerkbon:  { gt: 0 } },
        { urenContract: { gt: 0 } },
      ]});
    }
    if (search) {
      conditions.push({ OR: [
        { bonnummer:    { contains: search, mode: "insensitive" as const } },
        { omschrijving: { contains: search, mode: "insensitive" as const } },
        { klant:        { contains: search, mode: "insensitive" as const } },
        { eigenaar:     { contains: search, mode: "insensitive" as const } },
        { taakCode:     { contains: search, mode: "insensitive" as const } },
      ]});
    }

    const mWhere = {
      database: "MAINTENANCE" as Database,
      ...(conditions.length > 0 ? { AND: conditions } : {}),
    };

    const tarief  = DEFAULT_UREN_TARIEF["MAINTENANCE"];
    const algPct  = DEFAULT_ALG_KOSTEN_PCT / 100;

    const [rows, total, agg, aggGef] = await Promise.all([
      db.rmWerkbon.findMany({
        where: mWhere,
        orderBy: [{ datum: "desc" }, { bonnummer: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.rmWerkbon.count({ where: mWhere }),
      db.rmWerkbon.aggregate({
        where: mWhere,
        _sum: { opbrengsten: true, urenWerkbon: true, urenContract: true },
      }),
      db.rmWerkbon.aggregate({
        where: { ...mWhere, isGefactureerd: true },
        _sum: { opbrengsten: true },
      }),
    ]);

    const data = rows.map(wb => {
      const aanneemsom = Number(wb.opbrengsten ?? 0);
      const gef        = wb.isGefactureerd ? aanneemsom : 0;
      const uren       = Number(wb.urenWerkbon ?? 0) + Number(wb.urenContract ?? 0);
      const totaleKosten = uren * tarief + aanneemsom * algPct;
      const brutomarge   = gef - totaleKosten;
      const margePct     = totaleKosten > 0 ? brutomarge / totaleKosten * 100 : 0;
      const pctBetaald   = aanneemsom > 0 ? gef / aanneemsom * 100 : null;
      return {
        ID:                  wb.bonnummer,
        DATABASE:            "MAINTENANCE",
        PROJECTNUMMER:       wb.bonnummer,
        NAAM:                wb.omschrijving ?? "(geen omschrijving)",
        KLANT:               wb.klant ?? "",
        PROJECTLEIDER:       wb.eigenaar ?? "",
        STATUS:              WB_STATUS_MAP[wb.status] ?? "ACTIEF",
        AANNEEMSOM:          aanneemsom,
        MEERWERK:            0,
        TOTAAL_AANNEEMSOM:   aanneemsom,
        GEFACTUREERD_TOTAAL: gef,
        PCT_BETAALD:         pctBetaald,
        TOTALE_KOSTEN:       totaleKosten,
        BRUTOMARGE:          brutomarge,
        MARGE_PCT:           margePct,
      };
    });

    const totAanneemsom = Number(agg._sum.opbrengsten ?? 0);
    const totGef        = Number(aggGef._sum.opbrengsten ?? 0);
    const totUren       = Number(agg._sum.urenWerkbon ?? 0) + Number(agg._sum.urenContract ?? 0);
    const totKosten     = totUren * tarief + totAanneemsom * algPct;
    const totMarge      = totGef - totKosten;

    return Response.json({
      data, total, page, pageSize,
      totalPages: Math.ceil(total / pageSize),
      _source: "read-model",
      _totals: { aanneemsom: totAanneemsom, gefactureerd: totGef, kosten: totKosten, marge: totMarge },
    });
  }

  // ─── Projecten (rm_project_summary) ──────────────────────────────────────
  const rmCount = await db.rmProjectSummary.count({
    where: { database: database as Database, aanneemsom: { gte: 0 } },
  }).catch(() => 0);

  if (rmCount === 0) {
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

  const statusFilter = statusParam === "actueel"    ? { status: "ACTIEF" }
                     : statusParam === "historisch" ? { status: "HISTORISCH" }
                     : {};

  const where = {
    database:    database as Database,
    aanneemsom:  { gte: 0 },
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
        { naam:          { contains: search, mode: "insensitive" as const } },
        { projectNr:     { contains: search, mode: "insensitive" as const } },
        { klant:         { contains: search, mode: "insensitive" as const } },
        { projectleider: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const tarief = DEFAULT_UREN_TARIEF[database] ?? 7.5;
  const algPct = DEFAULT_ALG_KOSTEN_PCT / 100;

  const [rows, total, agg] = await Promise.all([
    db.rmProjectSummary.findMany({ where }),
    db.rmProjectSummary.count({ where }),
    db.rmProjectSummary.aggregate({
      where,
      _sum: {
        aanneemsom: true, gefactureerd: true,
        kostenMateriaal: true, kostenArbeid: true, kostenOverig: true,
        kostenPakbon: true, urenTotaal: true,
      },
    }),
  ]);

  const projectCodes = rows.map(r => r.projectNr);
  const inputs = await db.projectInput.findMany({
    where: { database: database as Database, projectCode: { in: projectCodes } },
  });
  const inputMap = new Map(inputs.map(i => [i.projectCode, i]));

  const rawData = rows.map(row => {
    const input  = inputMap.get(row.projectNr);
    const calc   = applyParams(row, database, input);
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
      PCT_BETAALD:         calc.pctBetaald,
      TOTALE_KOSTEN:       calc.totaleKosten,
      BRUTOMARGE:          calc.brutomarge,
      MARGE_PCT:           calc.margePct,
    };
  });

  const sorted = sortByProjectnr(rawData.map(r => ({ ...r, projectNr: r.PROJECTNUMMER })))
    .map(r => { const { projectNr: _, ...rest } = r; return rest; });
  const data = sorted.slice((page - 1) * pageSize, page * pageSize);

  // Globale totalen (over alle pagina's voor de huidige filter)
  const totAanneemsom = Number(agg._sum.aanneemsom ?? 0);
  const totGef        = Number(agg._sum.gefactureerd ?? 0);
  const totKosten     = Number(agg._sum.kostenMateriaal ?? 0)
                      + Number(agg._sum.kostenArbeid    ?? 0)
                      + Number(agg._sum.kostenOverig    ?? 0)
                      + Number(agg._sum.kostenPakbon    ?? 0)
                      + Number(agg._sum.urenTotaal      ?? 0) * tarief
                      + totAanneemsom * algPct;
  const totMarge = totGef - totKosten;

  return Response.json({
    data, total, page, pageSize,
    totalPages: Math.ceil(total / pageSize),
    _source: "read-model",
    _totals: { aanneemsom: totAanneemsom, gefactureerd: totGef, kosten: totKosten, marge: totMarge },
  });
}

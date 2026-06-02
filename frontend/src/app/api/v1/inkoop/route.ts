import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { Database } from "@prisma/client";

// Kostendrager-whitelist (sync met transform.ts)
const COST_STARTS   = ["7", "INT7"];
const COST_EXACT    = ["4", "5", "6", "9", "INT4", "INT5", "INT6", "INT9", "-", "5569"];
const COST_OVERHEAD = ["5514", "5561", "5574"];

function isCostRubriek(code: string): boolean {
  if (COST_OVERHEAD.includes(code)) return false;
  if (COST_STARTS.some(p => code.startsWith(p))) return true;
  if (COST_EXACT.includes(code)) return true;
  return false;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const s        = request.nextUrl.searchParams;
  const database = s.get("database") ?? "SERVICES";
  const page     = Math.max(1, Number(s.get("page") ?? 1));
  const pageSize = Math.min(500, Math.max(1, Number(s.get("pageSize") ?? 50)));
  const search   = s.get("search")?.toLowerCase() ?? "";
  const dateFrom = s.get("dateFrom");
  const dateTo   = s.get("dateTo");
  const sortDir  = s.get("sortDir") === "ASC" ? "asc" : "desc";

  const where: Prisma.RmJournaalWhereInput = {
    database:    database as Database,
    debetCredit: "D",
    typeRubriek: "W",
  };

  if (dateFrom && dateTo)   where.datum = { gte: new Date(dateFrom), lte: new Date(dateTo + "T23:59:59") };
  else if (dateFrom)        where.datum = { gte: new Date(dateFrom) };
  else if (dateTo)          where.datum = { lte: new Date(dateTo + "T23:59:59") };

  if (search) {
    where.OR = [
      { projectNr:     { contains: search, mode: "insensitive" } },
      { rubriekCode:   { contains: search, mode: "insensitive" } },
      { rubriekOmschr: { contains: search, mode: "insensitive" } },
      { omschrijving:  { contains: search, mode: "insensitive" } },
    ];
  }

  const [allRows, total] = await Promise.all([
    db.rmJournaal.findMany({ where, orderBy: { datum: sortDir }, skip: (page - 1) * pageSize, take: pageSize }),
    db.rmJournaal.count({ where }),
  ]);

  // Filter op kostendrager-whitelist (in-memory op de pagina, <500 rijen)
  const rows = allRows.filter(r => isCostRubriek(r.rubriekCode));

  const toDate = (d: unknown) => d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

  const data = rows.map(r => ({
    FACTUURNUMMER: `${r.projectNr}/${toDate(r.datum)}`,
    LEVERANCIER:   r.rubriekOmschr,    // Kostensoort als leverancier-proxy
    KOSTENSOORT:   r.rubriekCode,
    PROJECT:       r.projectNr,
    DATUM:         toDate(r.datum),
    BEDRAG_EXCL:   Number(r.bedrag),
    BTW:           0,
    TOTAALBEDRAG:  Number(r.bedrag),
    STATUS:        "GEBOEKT",
    OMSCHRIJVING:  r.omschrijving ?? "",
  }));

  return Response.json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

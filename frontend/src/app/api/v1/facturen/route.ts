import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { Database, Prisma } from "@prisma/client";

const OMZET_EXCLUDE = ["8030", "8040", "8045"];

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
    debetCredit: "C",
    typeRubriek: "W",
    rubriekCode: { startsWith: "8", notIn: OMZET_EXCLUDE },
  };

  if (dateFrom) where.datum = { gte: new Date(dateFrom) };
  if (dateTo)   where.datum = { ...(where.datum as Prisma.DateTimeFilter ?? {}), lte: new Date(dateTo + "T23:59:59") };

  if (search) {
    where.OR = [
      { projectNr:     { contains: search, mode: "insensitive" } },
      { rubriekOmschr: { contains: search, mode: "insensitive" } },
      { omschrijving:  { contains: search, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.rmJournaal.findMany({ where, orderBy: { datum: sortDir }, skip: (page - 1) * pageSize, take: pageSize }),
    db.rmJournaal.count({ where }),
  ]);

  const projectNrs = [...new Set(rows.map(r => r.projectNr))];
  const summaries  = await db.rmProjectSummary.findMany({
    where:  { database: database as Database, projectNr: { in: projectNrs } },
    select: { projectNr: true, klant: true },
  });
  const klantMap = new Map(summaries.map(s => [s.projectNr, s.klant]));

  const toDate = (d: unknown) => d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

  const data = rows.map(r => ({
    FACTUURNUMMER: `${r.rubriekCode}/${toDate(r.datum)}`,
    KLANT:         klantMap.get(r.projectNr) ?? r.projectNr,
    PROJECT:       r.projectNr,
    DATUM:         toDate(r.datum),
    VERVALDATUM:   null,
    BEDRAG_EXCL:   Number(r.bedrag),
    BTW:           0,
    TOTAALBEDRAG:  Number(r.bedrag),
    OPENSTAAND:    0,
    DAGEN_OVERDUE: 0,
    STATUS:        "BETAALD",
    RUBRIEK:       r.rubriekOmschr,
    OMSCHRIJVING:  r.omschrijving ?? "",
  }));

  return Response.json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

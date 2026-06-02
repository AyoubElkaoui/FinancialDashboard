import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { Database, Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const s         = request.nextUrl.searchParams;
  const database  = s.get("database") ?? "SERVICES";
  const page      = Math.max(1, Number(s.get("page") ?? 1));
  const pageSize  = Math.min(500, Math.max(1, Number(s.get("pageSize") ?? 50)));
  const rubriek   = s.get("rubriekCode") ?? "";   // filter op rubriekCode
  const dateFrom  = s.get("dateFrom");
  const dateTo    = s.get("dateTo");
  const search    = s.get("search")?.toLowerCase() ?? "";

  const where: Prisma.RmJournaalWhereInput = { database: database as Database };

  if (rubriek)                  where.rubriekCode = rubriek;
  if (dateFrom && dateTo)       where.datum = { gte: new Date(dateFrom), lte: new Date(dateTo + "T23:59:59") };
  else if (dateFrom)            where.datum = { gte: new Date(dateFrom) };
  else if (dateTo)              where.datum = { lte: new Date(dateTo + "T23:59:59") };

  if (search) {
    where.OR = [
      { projectNr:     { contains: search, mode: "insensitive" } },
      { rubriekCode:   { contains: search, mode: "insensitive" } },
      { rubriekOmschr: { contains: search, mode: "insensitive" } },
      { omschrijving:  { contains: search, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.rmJournaal.findMany({ where, orderBy: { datum: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    db.rmJournaal.count({ where }),
  ]);

  const toDate = (d: unknown) => d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

  const data = rows.map(r => ({
    DATUM:         toDate(r.datum),
    REKENINGNUMMER: r.rubriekCode,
    RUBRIEK:       r.rubriekOmschr,
    OMSCHRIJVING:  r.omschrijving ?? "",
    PROJECT:       r.projectNr,
    SOORT:         r.typeRubriek === "W" ? "W&V" : "Balans",
    DEBET:         r.debetCredit === "D" ? Number(r.bedrag) : 0,
    CREDIT:        r.debetCredit === "C" ? Number(r.bedrag) : 0,
  }));

  return Response.json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

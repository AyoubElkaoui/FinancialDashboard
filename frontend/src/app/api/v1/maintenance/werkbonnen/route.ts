import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { Database, Prisma } from "@prisma/client";

const STATUS_LABEL: Record<string, string> = {
  A: "Aangemaakt", I: "In uitvoering", U: "Uitgevoerd", V: "Voltoooid",
};
const METH_LABEL: Record<string, string> = {
  W: "Wacht op uren", G: "Gereed",
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const s        = req.nextUrl.searchParams;
  const database = (s.get("database") ?? "MAINTENANCE") as Database;
  const page     = Math.max(1, Number(s.get("page") ?? 1));
  const pageSize = Math.min(500, Math.max(1, Number(s.get("pageSize") ?? 50)));
  const search   = s.get("search")?.toLowerCase() ?? "";
  const status   = s.get("status") ?? "";
  const eigenaar = s.get("eigenaar") ?? "";
  const dateFrom = s.get("dateFrom");
  const dateTo   = s.get("dateTo");
  const sortDir  = s.get("sortDir") === "ASC" ? "asc" : "desc";
  const sortBy   = s.get("sortBy") ?? "datum";

  const where: Prisma.RmWerkbonWhereInput = { database };

  if (status === "openstaand")   where.status = { in: ["A", "I"] };
  else if (status === "afgerond") where.status = { in: ["U", "V"] };
  else if (status)                where.status = status;

  if (eigenaar) where.eigenaar = { contains: eigenaar, mode: "insensitive" };

  if (dateFrom && dateTo)   where.datum = { gte: new Date(dateFrom), lte: new Date(dateTo) };
  else if (dateFrom)        where.datum = { gte: new Date(dateFrom) };
  else if (dateTo)          where.datum = { lte: new Date(dateTo) };

  if (search) {
    where.OR = [
      { bonnummer:    { contains: search, mode: "insensitive" } },
      { klant:        { contains: search, mode: "insensitive" } },
      { omschrijving: { contains: search, mode: "insensitive" } },
      { eigenaar:     { contains: search, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.RmWerkbonOrderByWithRelationInput =
    sortBy === "bonnummer" ? { bonnummer: sortDir } :
    sortBy === "klant"     ? { klant:     sortDir } :
    sortBy === "status"    ? { status:    sortDir } :
                             { datum:     sortDir };

  const [rows, total] = await Promise.all([
    db.rmWerkbon.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    db.rmWerkbon.count({ where }),
  ]);

  const toDate = (d: unknown) =>
    d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

  const data = rows.map(wb => ({
    BONNUMMER:         wb.bonnummer,
    DATUM:             toDate(wb.datum),
    OMSCHRIJVING:      wb.omschrijving ?? "",
    STATUS:            wb.status,
    STATUS_LABEL:      STATUS_LABEL[wb.status] ?? wb.status,
    METH:              wb.methInUitvoering ?? "",
    METH_LABEL:        METH_LABEL[wb.methInUitvoering ?? ""] ?? "",
    FASE:              wb.fase ?? "",
    KLANT:             wb.klant ?? "",
    EIGENAAR:          wb.eigenaar ?? "",
    WERK_CODE:         wb.werkCode ?? "",
    IS_GEFACTUREERD:   wb.isGefactureerd,
    VOLLEDIG_BETAALD:  wb.volledigBetaald ?? false,
    // Financieel uit DB
    OPBRENGSTEN:       Number(wb.opbrengsten ?? 0),
    UREN_WERKBON:      wb.urenWerkbon != null ? Number(wb.urenWerkbon) : null,
    // Berekend (indirect = uren × €7.5; marge = opbrengsten - indirect)
    INDIRECT:          wb.urenWerkbon != null ? Number(wb.urenWerkbon) * 7.5 : null,
    B_MARGE:           wb.urenWerkbon != null
                         ? Number(wb.opbrengsten ?? 0) - Number(wb.urenWerkbon) * 7.5
                         : null,
    MARGE_PCT:         (wb.urenWerkbon != null && Number(wb.opbrengsten ?? 0) > 0)
                         ? ((Number(wb.opbrengsten ?? 0) - Number(wb.urenWerkbon) * 7.5)
                            / Number(wb.opbrengsten)) * 100
                         : null,
    // Handmatig
    STREEFMARGE_PCT:   wb.streefmargePct != null ? Number(wb.streefmargePct) : null,
    NOTITIES:          wb.notities ?? "",
  }));

  return Response.json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

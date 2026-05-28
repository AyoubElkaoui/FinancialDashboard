import type { NextRequest } from "next/server";
import { getDbWerkbonnen } from "@/lib/mock/elmar-data";

export async function GET(request: NextRequest) {
  const s        = request.nextUrl.searchParams;
  const database = s.get("database") ?? "SERVICES";
  const page     = Number(s.get("page")     ?? 1);
  const pageSize = Number(s.get("pageSize") ?? 50);
  const search   = s.get("search")?.toLowerCase();
  const status   = s.get("status")   ?? undefined;
  const type     = s.get("type")     ?? undefined;
  const dateFrom = s.get("dateFrom") ?? undefined;
  const dateTo   = s.get("dateTo")   ?? undefined;

  let items = getDbWerkbonnen(database);
  if (search)   items = items.filter((w) =>
    w.BONNUMMER.toLowerCase().includes(search) ||
    w.OMSCHRIJVING.toLowerCase().includes(search) ||
    w.KLANT.toLowerCase().includes(search)
  );
  if (status)   items = items.filter((w) => w.STATUS === status);
  if (type)     items = items.filter((w) => w.TYPE === type);
  if (dateFrom) items = items.filter((w) => w.DATUM >= dateFrom);
  if (dateTo)   items = items.filter((w) => w.DATUM <= dateTo);

  const total      = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const data       = items.slice((page - 1) * pageSize, page * pageSize);
  return Response.json({ data, total, page, pageSize, totalPages });
}

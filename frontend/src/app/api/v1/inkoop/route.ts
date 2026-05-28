import type { NextRequest } from "next/server";
import { getDbInkoopFacturen } from "@/lib/mock/elmar-data";

export async function GET(request: NextRequest) {
  const s        = request.nextUrl.searchParams;
  const database = s.get("database") ?? "SERVICES";
  const page     = Number(s.get("page")     ?? 1);
  const pageSize = Number(s.get("pageSize") ?? 50);
  const search   = s.get("search")?.toLowerCase();
  const dateFrom = s.get("dateFrom") ?? undefined;
  const dateTo   = s.get("dateTo")   ?? undefined;

  let items = getDbInkoopFacturen(database);
  if (search)   items = items.filter((i) =>
    i.LEVERANCIER.toLowerCase().includes(search) ||
    i.FACTUURNUMMER.toLowerCase().includes(search) ||
    i.KOSTENSOORT.toLowerCase().includes(search)
  );
  if (dateFrom) items = items.filter((i) => i.DATUM >= dateFrom);
  if (dateTo)   items = items.filter((i) => i.DATUM <= dateTo);

  const total      = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const data       = items.slice((page - 1) * pageSize, page * pageSize);
  return Response.json({ data, total, page, pageSize, totalPages });
}

import type { NextRequest } from "next/server";
import { getDbFacturen } from "@/lib/mock/elmar-data";

export async function GET(request: NextRequest) {
  const s = request.nextUrl.searchParams;
  const database = s.get("database") ?? "SERVICES";
  const page     = Number(s.get("page")     ?? 1);
  const pageSize = Number(s.get("pageSize") ?? 50);
  const search   = s.get("search")?.toLowerCase();
  const status   = s.get("status");   // "open" | "betaald" | undefined
  const dateFrom = s.get("dateFrom") ?? undefined;
  const dateTo   = s.get("dateTo")   ?? undefined;
  const sortByRaw = s.get("sortBy")   ?? "DATUM";
  const sortDir  = (s.get("sortDir") ?? "DESC") as "ASC" | "DESC";

  let items = getDbFacturen(database);

  if (search)   items = items.filter((f) => f.FACTUURNUMMER.toLowerCase().includes(search) || f.KLANT.toLowerCase().includes(search));
  if (status === "open")    items = items.filter((f) => f.OPENSTAAND > 0);
  if (status === "betaald") items = items.filter((f) => f.OPENSTAAND <= 0);
  if (dateFrom) items = items.filter((f) => f.DATUM >= dateFrom);
  if (dateTo)   items = items.filter((f) => f.DATUM <= dateTo);

  type Key = keyof (typeof items)[0];
  const key = sortByRaw as Key;
  items = [...items].sort((a, b) => {
    const av = a[key], bv = b[key];
    if (av == null) return 1; if (bv == null) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "DESC" ? -cmp : cmp;
  });

  const total      = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const data       = items.slice((page - 1) * pageSize, page * pageSize);

  return Response.json({ data, total, page, pageSize, totalPages });
}

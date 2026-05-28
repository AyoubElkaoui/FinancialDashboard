import type { NextRequest } from "next/server";
import { getDbKlanten } from "@/lib/mock/elmar-data";

export async function GET(request: NextRequest) {
  const s        = request.nextUrl.searchParams;
  const database = s.get("database") ?? "SERVICES";
  const page     = Number(s.get("page")     ?? 1);
  const pageSize = Number(s.get("pageSize") ?? 50);
  const search   = s.get("search")?.toLowerCase();

  let items = getDbKlanten(database);
  if (search) items = items.filter((k) =>
    k.NAAM.toLowerCase().includes(search) ||
    k.PLAATS.toLowerCase().includes(search) ||
    k.KLANTNUMMER.toLowerCase().includes(search)
  );

  const total      = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const data       = items.slice((page - 1) * pageSize, page * pageSize);
  return Response.json({ data, total, page, pageSize, totalPages });
}

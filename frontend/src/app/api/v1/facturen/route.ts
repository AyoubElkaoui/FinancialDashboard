import type { NextRequest } from "next/server";
import { mockFacturenList } from "@/lib/mock/handlers";

export async function GET(request: NextRequest) {
  const s = request.nextUrl.searchParams;
  return Response.json(mockFacturenList({
    page:      Number(s.get("page")     ?? 1),
    pageSize:  Number(s.get("pageSize") ?? 50),
    search:    s.get("search")    ?? undefined,
    status:    s.get("status")    ?? undefined,
    klantId:   s.get("klantId")   ? Number(s.get("klantId"))   : undefined,
    projectId: s.get("projectId") ? Number(s.get("projectId")) : undefined,
    dateFrom:  s.get("dateFrom")  ?? undefined,
    dateTo:    s.get("dateTo")    ?? undefined,
    sortBy:    s.get("sortBy")    ?? undefined,
    sortDir:   (s.get("sortDir") as "ASC"|"DESC") ?? undefined,
  }));
}

import type { NextRequest } from "next/server";
import { mockGrootboekMutaties } from "@/lib/mock/handlers";

export async function GET(request: NextRequest) {
  const s = request.nextUrl.searchParams;
  return Response.json(mockGrootboekMutaties({
    page:      Number(s.get("page")     ?? 1),
    pageSize:  Number(s.get("pageSize") ?? 50),
    rubriekId: s.get("rubriekId") ? Number(s.get("rubriekId")) : undefined,
    dateFrom:  s.get("dateFrom") ?? undefined,
    dateTo:    s.get("dateTo")   ?? undefined,
    sortDir:   (s.get("sortDir") as "ASC"|"DESC") ?? undefined,
  }));
}

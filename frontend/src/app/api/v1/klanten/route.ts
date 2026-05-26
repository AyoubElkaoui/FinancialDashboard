import type { NextRequest } from "next/server";
import { mockKlantenList } from "@/lib/mock/handlers";

export async function GET(request: NextRequest) {
  const s = request.nextUrl.searchParams;
  return Response.json(mockKlantenList({
    page:     Number(s.get("page")     ?? 1),
    pageSize: Number(s.get("pageSize") ?? 50),
    search:   s.get("search")  ?? undefined,
    sortBy:   s.get("sortBy")  ?? undefined,
    sortDir:  (s.get("sortDir") as "ASC"|"DESC") ?? undefined,
  }));
}

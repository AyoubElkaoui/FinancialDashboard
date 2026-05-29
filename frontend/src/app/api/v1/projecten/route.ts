import type { NextRequest } from "next/server";
import { getElmarProjecten } from "@/lib/mock/elmar-data";

const PROJECT_DATABASES = ["SERVICES", "KEYSER", "INTERNATIONAL"] as const;

export async function GET(request: NextRequest) {
  const s = request.nextUrl.searchParams;
  const database = s.get("database") ?? "SERVICES";

  const all = database === "ALL"
    ? PROJECT_DATABASES.flatMap(db => getElmarProjecten(db))
    : getElmarProjecten(database);

  const search = s.get("search")?.toLowerCase() ?? "";
  const filtered = search
    ? all.filter(p =>
        p.NAAM.toLowerCase().includes(search) ||
        p.PROJECTNUMMER.toLowerCase().includes(search) ||
        p.KLANT.toLowerCase().includes(search)
      )
    : all;

  return Response.json({
    data: filtered,
    total: filtered.length,
    page: 1,
    pageSize: filtered.length,
    totalPages: 1,
  });
}

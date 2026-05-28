import type { NextRequest } from "next/server";
import { getDbDashboardKpis } from "@/lib/mock/elmar-data";

export async function GET(request: NextRequest) {
  const database = request.nextUrl.searchParams.get("database") ?? "SERVICES";
  return Response.json(getDbDashboardKpis(database));
}

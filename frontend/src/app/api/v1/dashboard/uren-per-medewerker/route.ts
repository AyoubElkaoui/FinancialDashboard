import type { NextRequest } from "next/server";
import { getDbUrenPerMedewerker } from "@/lib/mock/elmar-data";
export async function GET(req: NextRequest) {
  const database = req.nextUrl.searchParams.get("database") ?? "SERVICES";
  return Response.json(getDbUrenPerMedewerker(database));
}

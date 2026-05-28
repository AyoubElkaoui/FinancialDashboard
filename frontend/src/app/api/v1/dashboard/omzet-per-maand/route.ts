import type { NextRequest } from "next/server";
import { getDbOmzetPerMaand } from "@/lib/mock/elmar-data";

export async function GET(req: NextRequest) {
  const database = req.nextUrl.searchParams.get("database") ?? "SERVICES";
  return Response.json(getDbOmzetPerMaand(database));
}

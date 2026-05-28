import type { NextRequest } from "next/server";
import { getDbKlantDetail } from "@/lib/mock/elmar-data";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const database = req.nextUrl.searchParams.get("database") ?? "SERVICES";
  const data = getDbKlantDetail(database, Number(id));
  if (!data) return Response.json({ error: "Niet gevonden" }, { status: 404 });
  return Response.json(data);
}

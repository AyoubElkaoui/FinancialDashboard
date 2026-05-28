import type { NextRequest } from "next/server";
import { mockProjectDetail } from "@/lib/mock/handlers";
import { getElmarRapport } from "@/lib/mock/elmar-data";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const database = req.nextUrl.searchParams.get("database");

  // If a database param is provided, return elmar rapport data
  if (database) {
    const rapport = getElmarRapport(Number(id), database);
    if (!rapport)
      return Response.json({ error: "Project niet gevonden" }, { status: 404 });
    return Response.json(rapport);
  }

  // Fallback to legacy mock data
  const data = mockProjectDetail(Number(id));
  if (!data) return Response.json({ error: "Niet gevonden" }, { status: 404 });
  return Response.json(data);
}

import type { NextRequest } from "next/server";
import { getElmarRapport } from "@/lib/mock/elmar-data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const database = request.nextUrl.searchParams.get("database") ?? "SERVICES";
  const rapport = getElmarRapport(Number(id), database);
  if (!rapport)
    return Response.json({ error: "Project niet gevonden" }, { status: 404 });
  return Response.json(rapport);
}

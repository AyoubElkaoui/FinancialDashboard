import { mockProjectDetail } from "@/lib/mock/handlers";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = mockProjectDetail(Number(id));
  if (!data) return Response.json({ error: "Niet gevonden" }, { status: 404 });
  return Response.json(data);
}

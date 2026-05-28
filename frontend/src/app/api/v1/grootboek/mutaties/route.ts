import type { NextRequest } from "next/server";
import { getDbGrootboekMutaties, getDbGrootboekRubrieken } from "@/lib/mock/elmar-data";

export async function GET(request: NextRequest) {
  const s        = request.nextUrl.searchParams;
  const database = s.get("database") ?? "SERVICES";
  const page     = Number(s.get("page")     ?? 1);
  const pageSize = Number(s.get("pageSize") ?? 50);
  const rubriekId = s.get("rubriekId") ? Number(s.get("rubriekId")) : undefined;
  const dateFrom  = s.get("dateFrom") ?? undefined;
  const dateTo    = s.get("dateTo")   ?? undefined;

  let items = getDbGrootboekMutaties(database);

  if (rubriekId) {
    const rubrieken = getDbGrootboekRubrieken(database);
    const rubriek   = rubrieken.find((r) => r.ID === rubriekId);
    if (rubriek) items = items.filter((m) => m.REKENINGNUMMER === rubriek.REKENINGNUMMER);
  }
  if (dateFrom) items = items.filter((m) => m.DATUM >= dateFrom);
  if (dateTo)   items = items.filter((m) => m.DATUM <= dateTo);

  const total      = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const data       = items.slice((page - 1) * pageSize, page * pageSize);
  return Response.json({ data, total, page, pageSize, totalPages });
}

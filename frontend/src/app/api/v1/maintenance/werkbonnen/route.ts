import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getMaintenanceWerkbonnen } from "@/lib/mock/maintenance-data";
import type { WerkbonCategorie, WerkbonStatus } from "@/lib/mock/maintenance-data";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const klantId   = p.get("klantId")   ?? undefined;
  const categorie = p.get("categorie") as WerkbonCategorie | null;
  const status    = p.get("status")    as WerkbonStatus    | null;
  const dateFrom  = p.get("dateFrom")  ?? undefined;
  const dateTo    = p.get("dateTo")    ?? undefined;
  const search    = p.get("search")?.toLowerCase() ?? "";
  const page      = Math.max(1, Number(p.get("page") ?? 1));
  const pageSize  = Math.min(200, Number(p.get("pageSize") ?? 50));

  let bons = getMaintenanceWerkbonnen();

  if (klantId)   bons = bons.filter(b => b.klantId === klantId);
  if (categorie) bons = bons.filter(b => b.categorie === categorie);
  if (status)    bons = bons.filter(b => b.status === status);
  if (dateFrom)  bons = bons.filter(b => b.datum >= dateFrom);
  if (dateTo)    bons = bons.filter(b => b.datum <= dateTo);
  if (search)    bons = bons.filter(b =>
    b.id.toLowerCase().includes(search) ||
    b.klantNaam.toLowerCase().includes(search) ||
    b.omschrijving.toLowerCase().includes(search) ||
    b.technicus.toLowerCase().includes(search)
  );

  const total = bons.length;
  const data  = bons.slice((page - 1) * pageSize, page * pageSize);

  return NextResponse.json({ data, total, page, pageSize });
}

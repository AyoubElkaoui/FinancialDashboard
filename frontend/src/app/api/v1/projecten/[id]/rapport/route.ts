import type { NextRequest } from "next/server";
import { getElmarRapport } from "@/lib/mock/elmar-data";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const database = request.nextUrl.searchParams.get("database") ?? "SERVICES";

  const base = getElmarRapport(Number(id), database);
  if (!base) return Response.json({ error: "Project niet gevonden" }, { status: 404 });

  // Apply any user-saved overrides from Neon
  let input = null;
  try {
    input = await db.projectInput.findUnique({
      where: { database_projectCode: { database: database as never, projectCode: base.PROJECTNUMMER } },
    });
  } catch { /* DB unreachable — serve mock data as-is */ }

  if (!input) return Response.json({ ...base, hasOverrides: false });

  const UREN_AANTAL    = input.urenAantal   ?? base.UREN_AANTAL;
  const UREN_TARIEF    = input.urenTarief   ?? base.UREN_TARIEF;
  const ALG_KOSTEN_PCT = input.algKostenPct ?? base.ALG_KOSTEN_PCT;
  const OPMERKINGEN    = input.opmerkingen  ?? base.OPMERKINGEN;

  const INDIRECTE_KOSTEN = UREN_AANTAL * UREN_TARIEF;
  const ALG_KOSTEN       = Math.round(base.DIRECTE_KOSTEN * ALG_KOSTEN_PCT / 100 * 100) / 100;
  const TOTALE_KOSTEN    = base.DIRECTE_KOSTEN + INDIRECTE_KOSTEN + ALG_KOSTEN;
  const BRUTOMARGE       = Math.round((base.GEFACTUREERD_TOTAAL - TOTALE_KOSTEN) * 100) / 100;
  const MARGE_PCT        = base.GEFACTUREERD_TOTAAL > 0
    ? Math.round(BRUTOMARGE / base.GEFACTUREERD_TOTAAL * 10000) / 100
    : 0;

  return Response.json({
    ...base,
    UREN_AANTAL,
    UREN_TARIEF,
    ALG_KOSTEN_PCT,
    OPMERKINGEN,
    INDIRECTE_KOSTEN,
    ALG_KOSTEN,
    TOTALE_KOSTEN,
    BRUTOMARGE,
    MARGE_PCT,
    hasOverrides: true,
    overriddenBy: input.updatedBy,
    overriddenAt: input.updatedAt,
  });
}

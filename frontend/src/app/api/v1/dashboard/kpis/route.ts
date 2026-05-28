import type { NextRequest } from "next/server";
import { getElmarProjecten } from "@/lib/mock/elmar-data";

export async function GET(request: NextRequest) {
  const database = request.nextUrl.searchParams.get("database") ?? "SERVICES";
  const projecten = getElmarProjecten(database);

  const actieve_projecten = projecten.filter((p) => p.STATUS === "ACTIEF").length;
  const totaal_aanneemsom = projecten.reduce((s, p) => s + p.TOTAAL_AANNEEMSOM, 0);
  const totaal_gefactureerd = projecten.reduce((s, p) => s + p.GEFACTUREERD_TOTAAL, 0);
  const totaal_betaald = projecten.reduce((s, p) => s + p.BETAALD_TOTAAL, 0);
  const totaal_onbetaald = Math.round((totaal_gefactureerd - totaal_betaald) * 100) / 100;
  const totale_kosten = projecten.reduce((s, p) => s + p.TOTALE_KOSTEN, 0);
  const brutomarge = Math.round((totaal_gefactureerd - totale_kosten) * 100) / 100;
  const marge_pct =
    totaal_gefactureerd > 0
      ? Math.round((brutomarge / totaal_gefactureerd) * 10000) / 100
      : 0;

  return Response.json({
    database,
    actieve_projecten,
    totaal_aanneemsom: Math.round(totaal_aanneemsom * 100) / 100,
    totaal_gefactureerd: Math.round(totaal_gefactureerd * 100) / 100,
    totaal_betaald: Math.round(totaal_betaald * 100) / 100,
    totaal_onbetaald,
    totale_kosten: Math.round(totale_kosten * 100) / 100,
    brutomarge,
    marge_pct,
  });
}

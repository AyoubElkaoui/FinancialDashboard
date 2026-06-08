import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import type { Database } from "@prisma/client";

const DEFAULT_UREN_TARIEF: Record<string, number> = {
  SERVICES:      7.5,
  INTERNATIONAL: 7.5,
  MAINTENANCE:   7.5,
  KEYSER:        10,
};
const DEFAULT_ALG_KOSTEN_PCT = 5;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const database = (request.nextUrl.searchParams.get("database") ?? "SERVICES") as Database;

  // Zoek in read-model (ID is altijd een string projectcode, bijv. "100-16-032")
  let rm = null;
  let dbError: string | null = null;
  try {
    rm = await db.rmProjectSummary.findFirst({
      where: { database, projectNr: id },
    });
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  if (!rm) {
    // Tijdelijk: stuur dbError mee zodat we in DevTools de echte oorzaak zien
    return Response.json({
      error:    "Project niet gevonden",
      id,
      database: database as string,
      dbError,
    }, { status: 404 });
  }

  // App-parameters (optioneel)
  let input = null;
  try {
    input = await db.projectInput.findUnique({
      where: { database_projectCode: { database, projectCode: id } },
    });
  } catch { /* geen overrides */ }

  const urenTarief   = Number(input?.urenTarief   ?? (DEFAULT_UREN_TARIEF[database] ?? 7.5));
  // Alg. kosten grondslag = aanneemsom (incl. meerwerk zodra apart gesynchroniseerd)
  const algKostenPct = Number(input?.algKostenPct ?? DEFAULT_ALG_KOSTEN_PCT);

  const aanneemsom    = Number(rm.aanneemsom)    || 0;
  const gefactureerd  = Number(rm.gefactureerd)  || 0;
  const onbetaald     = Number(rm.onbetaald)     || 0;
  const urenTotaal    = Number(rm.urenTotaal)    || 0;
  const kostenSyntess = (Number(rm.kostenMateriaal) || 0)
                      + (Number(rm.kostenArbeid)    || 0)
                      + (Number(rm.kostenOverig)    || 0)
                      + (Number(rm.kostenPakbon)    || 0);  // pakbon-kosten (A8)
  const kostenIndirect = urenTotaal * urenTarief;
  const kostenAlgemeen = aanneemsom * (algKostenPct / 100);
  const totaleKosten   = kostenSyntess + kostenIndirect + kostenAlgemeen;
  const brutomarge     = gefactureerd - totaleKosten;
  // KN = totale kosten; marge % = brutomarge ÷ totale kosten × 100
  const margePct       = totaleKosten > 0 ? (brutomarge / totaleKosten) * 100 : 0;
  const pctBetaald     = aanneemsom   > 0 ? (gefactureerd / aanneemsom)  * 100 : 0;
  const nietGefactureerdPct = aanneemsom > 0 ? ((aanneemsom - gefactureerd) / aanneemsom) * 100 : 0;
  const betaald        = Math.max(0, gefactureerd - onbetaald);

  // Journaalregels als factuurproxy (credit 8xxx, laatste 365 dagen)
  let journaalOmzet: { rubriekCode: string; datum: unknown; bedrag: unknown }[] = [];
  try {
    journaalOmzet = await db.rmJournaal.findMany({
      where: { database, projectNr: id, debetCredit: "C", typeRubriek: "W" },
      orderBy: { datum: "desc" },
      take: 100,
      select: { rubriekCode: true, datum: true, bedrag: true },
    });
  } catch { /* geen journaaldata */ }

  const toDate = (d: unknown) =>
    d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

  const facturen = journaalOmzet.map(j => ({
    FACTUURNUMMER: `${j.rubriekCode}/${toDate(j.datum)}`,
    DATUM:         toDate(j.datum),
    BEDRAG_EXCL:   Number(j.bedrag),
    STATUS:        "BETAALD" as const,
    BETAALD_BEDRAG: Number(j.bedrag),
  }));

  return Response.json({
    ID:              rm.projectNr,
    DATABASE:        database as string,
    PROJECTNUMMER:   rm.projectNr,
    NAAM:            rm.naam,
    KLANT:           rm.klant,
    PROJECTLEIDER:   rm.projectleider ?? "",
    STATUS:          rm.status,
    STARTDATUM:      rm.startdatum ? (rm.startdatum instanceof Date ? rm.startdatum.toISOString().slice(0, 10) : String(rm.startdatum).slice(0, 10)) : "",
    EINDDATUM:       null,
    AANNEEMSOM:      aanneemsom,
    MEERWERK:        0,
    TERMIJNEN:       [],
    FACTUREN:        facturen,
    DIRECTE_KOSTEN:  kostenSyntess,
    UREN_AANTAL:     urenTotaal,
    UREN_TARIEF:     urenTarief,
    ALG_KOSTEN_PCT:  algKostenPct,
    OPMERKINGEN:     input?.opmerkingen ?? "",
    TOTAAL_AANNEEMSOM: aanneemsom,
    INDIRECTE_KOSTEN:  kostenIndirect,
    ALG_KOSTEN:        kostenAlgemeen,
    TOTALE_KOSTEN:     totaleKosten,
    GEFACTUREERD_TOTAAL: gefactureerd,
    BETAALD_TOTAAL:    betaald,
    ONBETAALD_TOTAAL:  Math.max(0, onbetaald),
    PCT_BETAALD:       pctBetaald,
    NIET_GEFACTUREERD_PCT: nietGefactureerdPct,
    BRUTOMARGE:        brutomarge,
    MARGE_PCT:         margePct,
    hasOverrides:  !!input,
    overriddenBy:  input?.updatedBy  ?? undefined,
    overriddenAt:  input?.updatedAt?.toISOString() ?? undefined,
    _kosten: {
      materiaal: Number(rm.kostenMateriaal) || 0,
      arbeid:    Number(rm.kostenArbeid)    || 0,
      overig:    Number(rm.kostenOverig)    || 0,
      pakbon:    Number(rm.kostenPakbon)    || 0,
      indirect:  kostenIndirect,
      algemeen:  kostenAlgemeen,
    },
  });
}

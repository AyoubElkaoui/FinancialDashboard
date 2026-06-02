import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getElmarRapport } from "@/lib/mock/elmar-data";
import type { Database } from "@prisma/client";

const DEFAULT_UREN_TARIEF = 7.5;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const { id } = await params;
  const database = req.nextUrl.searchParams.get("database") ?? "SERVICES";

  // Zoek in read-model op projectnummer (ID is altijd een string projectcode)
  const rm = await db.rmProjectSummary.findUnique({
    where: { database_projectNr: { database: database as Database, projectNr: id } },
  }).catch(() => null);

  if (!rm) {
    // Terugvallen op mock voor MAINTENANCE / niet-gesynchroniseerde databases
    const rapport = getElmarRapport(Number(id), database);
    if (rapport) return Response.json(rapport);
    return Response.json({ error: "Project niet gevonden" }, { status: 404 });
  }

  // App-parameters voor berekeningen
  const input = await db.projectInput.findUnique({
    where: { database_projectCode: { database: database as Database, projectCode: id } },
  }).catch(() => null);

  const urenTarief   = Number(input?.urenTarief   ?? DEFAULT_UREN_TARIEF);
  const algKostenPct = Number(input?.algKostenPct ?? 0);

  const aanneemsom    = Number(rm.aanneemsom)    || 0;
  const gefactureerd  = Number(rm.gefactureerd)  || 0;
  const onbetaald     = Number(rm.onbetaald)     || 0;
  const urenTotaal    = Number(rm.urenTotaal)    || 0;
  const kostenSyntess = (Number(rm.kostenMateriaal) || 0)
                      + (Number(rm.kostenArbeid)    || 0)
                      + (Number(rm.kostenOverig)    || 0);
  const kostenIndirect = urenTotaal * urenTarief;
  const kostenAlgemeen = kostenSyntess * (algKostenPct / 100);
  const totaleKosten   = kostenSyntess + kostenIndirect + kostenAlgemeen;
  const brutomarge     = gefactureerd - totaleKosten;
  const margePct       = gefactureerd > 0 ? (brutomarge / gefactureerd) * 100 : 0;
  const pctBetaald     = aanneemsom   > 0 ? (gefactureerd / aanneemsom)  * 100 : 0;
  const betaald        = Math.max(0, gefactureerd - onbetaald);

  // Journaaldetails: omzet-rubrieken als factuurregels (beste beschikbare bron)
  const journaalOmzet = await db.rmJournaal.findMany({
    where: {
      database:   database as Database,
      projectNr:  id,
      debetCredit: "C",
      typeRubriek: "W",
    },
    orderBy: { datum: "desc" },
    take: 100,
  }).catch(() => []);

  // Maak pseudo-factuurregels van de journaalboekingen
  const facturen = journaalOmzet.map(j => ({
    FACTUURNUMMER: `${j.rubriekCode}/${j.datum instanceof Date
      ? j.datum.toISOString().slice(0, 10)
      : String(j.datum).slice(0, 10)}`,
    DATUM:         j.datum instanceof Date
      ? j.datum.toISOString().slice(0, 10)
      : String(j.datum).slice(0, 10),
    BEDRAG_EXCL:   Number(j.bedrag),
    STATUS:        "BETAALD" as const,
    BETAALD_BEDRAG: Number(j.bedrag),
  }));

  return Response.json({
    // ElmarProject velden
    ID:              rm.projectNr,
    DATABASE:        database,
    PROJECTNUMMER:   rm.projectNr,
    NAAM:            rm.naam,
    KLANT:           rm.klant,
    PROJECTLEIDER:   "",
    STATUS:          rm.status,
    STARTDATUM:      "",
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
    // ElmarRapport velden
    TOTAAL_AANNEEMSOM: aanneemsom,
    INDIRECTE_KOSTEN:  kostenIndirect,
    ALG_KOSTEN:        kostenAlgemeen,
    TOTALE_KOSTEN:     totaleKosten,
    GEFACTUREERD_TOTAAL: gefactureerd,
    BETAALD_TOTAAL:    betaald,
    ONBETAALD_TOTAAL:  Math.max(0, onbetaald),
    PCT_BETAALD:       pctBetaald,
    BRUTOMARGE:        brutomarge,
    MARGE_PCT:         margePct,
    // Extra metadata
    hasOverrides:  !!input,
    overriddenBy:  input?.updatedBy ?? undefined,
    overriddenAt:  input?.updatedAt?.toISOString() ?? undefined,
    _kosten: {
      materiaal: Number(rm.kostenMateriaal) || 0,
      arbeid:    Number(rm.kostenArbeid)    || 0,
      overig:    Number(rm.kostenOverig)    || 0,
      indirect:  kostenIndirect,
      algemeen:  kostenAlgemeen,
    },
  });
}

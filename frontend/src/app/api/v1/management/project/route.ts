import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { Database } from "@prisma/client";

const DEFAULT_UREN_TARIEF: Record<string, number> = {
  SERVICES:      7.5,
  INTERNATIONAL: 7.5,
  MAINTENANCE:   7.5,
  KEYSER:        10,
};
const DEFAULT_ALG_KOSTEN_PCT = 5;

const WB_STATUS_LABELS: Record<string, string> = {
  A: "Aangemaakt", I: "In uitvoering", U: "Uitgevoerd", V: "Voltooid",
};

function toISO(d: unknown): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Niet ingelogd" }, { status: 401 });

  const s         = request.nextUrl.searchParams;
  const projectNr = s.get("projectNr") ?? "";
  const database  = (s.get("database") ?? "SERVICES") as Database;

  if (!projectNr) return Response.json({ error: "projectNr vereist" }, { status: 400 });

  // ─── MAINTENANCE: werkbon-type ─────────────────────────────────────────────
  if (database === "MAINTENANCE") {
    const wb = await db.rmWerkbon.findFirst({ where: { database, bonnummer: projectNr } });
    if (!wb) return Response.json({ error: "Werkbon niet gevonden" }, { status: 404 });

    const tarief   = DEFAULT_UREN_TARIEF["MAINTENANCE"];
    const algPct   = DEFAULT_ALG_KOSTEN_PCT / 100;
    const aanneemsom   = Number(wb.opbrengsten ?? 0);
    const gef          = wb.isGefactureerd ? aanneemsom : 0;
    const urenWerkbon  = Number(wb.urenWerkbon  ?? 0);
    const urenContract = Number(wb.urenContract ?? 0);
    const urenTotaal   = urenWerkbon + urenContract;
    const kostenIndirect = urenTotaal * tarief;
    const kostenAlgemeen = aanneemsom * algPct;
    const totaleKosten   = kostenIndirect + kostenAlgemeen;
    const brutomarge     = gef - totaleKosten;
    const margePct       = totaleKosten > 0 ? brutomarge / totaleKosten * 100 : 0;

    return Response.json({
      type: "werkbon",
      project: {
        projectNr:     wb.bonnummer,
        naam:          wb.omschrijving ?? "(geen omschrijving)",
        klant:         wb.klant ?? "",
        projectleider: wb.eigenaar ?? "",
        status:        wb.status,
        statusLabel:   WB_STATUS_LABELS[wb.status] ?? wb.status,
        datum:         wb.datum ? toISO(wb.datum) : null,
        isGefactureerd: wb.isGefactureerd,
        werkCode:      wb.werkCode ?? null,
        taakCode:      wb.taakCode ?? null,
        fase:          wb.fase ?? null,
      },
      berekening: {
        aanneemsom,
        gefactureerd:  gef,
        urenWerkbon,
        urenContract,
        urenTotaal,
        urenTarief:    tarief,
        algKostenPct:  DEFAULT_ALG_KOSTEN_PCT,
        kostenDirect:  0,
        kostenPakbon:  0,
        kostenIndirect,
        kostenAlgemeen,
        totaleKosten,
        brutomarge,
        margePct,
        pctBetaald: aanneemsom > 0 ? gef / aanneemsom * 100 : null,
      },
      journaalKosten:     [],
      journaalOpbrengsten: [],
      urenDetail:          [],
      urenPerMedewerker:   [],
      _journaalPeriode:    null,
    });
  }

  // ─── Project-type: Services / International / Keyser ──────────────────────
  const rm = await db.rmProjectSummary.findFirst({ where: { database, projectNr } });
  if (!rm) return Response.json({ error: "Project niet gevonden" }, { status: 404 });

  const input = await db.projectInput.findUnique({
    where: { database_projectCode: { database, projectCode: projectNr } },
  }).catch(() => null);

  const urenTarief   = Number(input?.urenTarief  ?? (DEFAULT_UREN_TARIEF[database] ?? 7.5));
  const algKostenPct = Number(input?.algKostenPct ?? DEFAULT_ALG_KOSTEN_PCT);

  const aanneemsom    = Number(rm.aanneemsom)    || 0;
  const gefactureerd  = Number(rm.gefactureerd)  || 0;
  const onbetaald     = Number(rm.onbetaald)     || 0;
  const urenTotaal    = Number(rm.urenTotaal)    || 0;
  const kostenMat     = Number(rm.kostenMateriaal) || 0;
  const kostenArb     = Number(rm.kostenArbeid)    || 0;
  const kostenOvg     = Number(rm.kostenOverig)    || 0;
  const kostenPakbon  = Number(rm.kostenPakbon)    || 0;
  const kostenDirect  = kostenMat + kostenArb + kostenOvg;
  const kostenIndirect = urenTotaal * urenTarief;
  const kostenAlgemeen = aanneemsom * (algKostenPct / 100);
  const totaleKosten   = kostenDirect + kostenPakbon + kostenIndirect + kostenAlgemeen;
  const brutomarge     = gefactureerd - totaleKosten;
  const margePct       = totaleKosten > 0 ? brutomarge / totaleKosten * 100 : 0;
  const pctBetaald     = aanneemsom > 0 ? gefactureerd / aanneemsom * 100 : null;

  // Journaal + uren detail (laatste 365 dagen)
  const [journaalRaw, urenRaw] = await Promise.all([
    db.rmJournaal.findMany({
      where: { database, projectNr },
      orderBy: { datum: "desc" },
    }),
    db.rmUren.findMany({
      where: { database, projectNr },
      orderBy: [{ medewerker: "asc" }, { datum: "desc" }],
    }),
  ]);

  // Kosten = typeRubriek W, debetCredit D
  const journaalKosten = journaalRaw
    .filter(j => j.typeRubriek === "W" && j.debetCredit === "D")
    .map(j => ({
      datum:        toISO(j.datum),
      rubriekCode:  j.rubriekCode,
      rubriekOmschr: j.rubriekOmschr,
      bedrag:       Number(j.bedrag),
      omschrijving: j.omschrijving ?? null,
    }));

  // Opbrengsten = typeRubriek B + W credits (facturen/memoriaal)
  const journaalOpbrengsten = journaalRaw
    .filter(j => j.typeRubriek === "B" || (j.typeRubriek === "W" && j.debetCredit === "C"))
    .map(j => ({
      datum:        toISO(j.datum),
      rubriekCode:  j.rubriekCode,
      rubriekOmschr: j.rubriekOmschr,
      debetCredit:  j.debetCredit,
      bedrag:       Number(j.bedrag),
      omschrijving: j.omschrijving ?? null,
    }));

  // Uren detail + gegroepeerd per medewerker
  const urenDetail = urenRaw.map(u => ({
    medewerker:   u.medewerker,
    datum:        toISO(u.datum),
    aantal:       Number(u.aantal),
    omschrijving: u.omschrijving ?? null,
  }));

  const medMap: Record<string, { medewerker: string; totaal: number }> = {};
  for (const u of urenDetail) {
    if (!medMap[u.medewerker]) medMap[u.medewerker] = { medewerker: u.medewerker, totaal: 0 };
    medMap[u.medewerker].totaal += u.aantal;
  }
  const urenPerMedewerker = Object.values(medMap).sort((a, b) => b.totaal - a.totaal);

  return Response.json({
    type: "project",
    project: {
      projectNr:     rm.projectNr,
      naam:          rm.naam,
      klant:         rm.klant,
      projectleider: rm.projectleider ?? "",
      status:        rm.status,
      statusLabel:   rm.status === "ACTIEF" ? "Actueel" : "Historisch",
      startdatum:    rm.startdatum ? toISO(rm.startdatum) : null,
    },
    berekening: {
      aanneemsom,
      gefactureerd,
      onbetaald,
      betaald:       Math.max(0, gefactureerd - onbetaald),
      urenTotaal,
      urenTarief,
      algKostenPct,
      kostenMateriaal: kostenMat,
      kostenArbeid:    kostenArb,
      kostenOverig:    kostenOvg,
      kostenDirect,
      kostenPakbon,
      kostenIndirect,
      kostenAlgemeen,
      totaleKosten,
      brutomarge,
      margePct,
      pctBetaald,
    },
    journaalKosten,
    journaalOpbrengsten,
    urenDetail,
    urenPerMedewerker,
    _journaalPeriode: journaalRaw.length > 0 ? "365 dagen" : null,
  });
}

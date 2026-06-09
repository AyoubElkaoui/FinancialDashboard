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

  // ─── Alle databases: lees uit rm_project_summary ──────────────────────────
  const rm = await db.rmProjectSummary.findFirst({ where: { database, projectNr } });
  if (!rm) return Response.json({ error: "Project niet gevonden" }, { status: 404 });

  const input = await db.projectInput.findUnique({
    where: { database_projectCode: { database, projectCode: projectNr } },
  }).catch(() => null);

  const urenTarief   = Number(input?.urenTarief  ?? (DEFAULT_UREN_TARIEF[database] ?? 7.5));
  const algKostenPct = Number(input?.algKostenPct ?? DEFAULT_ALG_KOSTEN_PCT);

  const aanneemsom    = Number(rm.aanneemsom)    || 0;
  const gefactureerd  = Number(rm.gefactureerd)  || 0;
  const nogTeFactureren = Number(rm.nogTeFactureren) || 0;
  const urenTotaal    = Number(rm.urenTotaal)    || 0;

  // Kosten: gebruik AV_KOSTREG_2 categorietotalen als beschikbaar
  const kostenACateg = Number(rm.kostenACateg) || 0;
  const kostenMCateg = Number(rm.kostenMCateg) || 0;
  const kostenOCateg = Number(rm.kostenOCateg) || 0;
  const heeftCateg   = (kostenACateg + kostenMCateg + kostenOCateg) > 0;

  const kostenDirect   = heeftCateg
    ? kostenACateg + kostenMCateg + kostenOCateg
    : (Number(rm.kostenMateriaal) || 0) + (Number(rm.kostenArbeid) || 0) + (Number(rm.kostenOverig) || 0);
  const kostenPakbon   = Number(rm.kostenPakbon) || 0;
  const kostenIndirect = urenTotaal * urenTarief;
  const kostenAlgemeen = aanneemsom * (algKostenPct / 100);
  const totaleKosten   = kostenDirect + kostenPakbon + kostenIndirect + kostenAlgemeen;
  const brutomarge     = gefactureerd - totaleKosten;
  // Marge % = brutomarge ÷ omzet (AT_KLNTBREG gefactureerd)
  const margePct       = gefactureerd > 0 ? brutomarge / gefactureerd * 100 : 0;
  const pctGefact      = aanneemsom > 0 ? gefactureerd / aanneemsom * 100 : null;

  // Journaal, uren en kosten-regels parallel ophalen
  const [journaalRaw, urenRaw, kostenRegels] = await Promise.all([
    db.rmJournaal.findMany({
      where: { database, projectNr },
      orderBy: { datum: "desc" },
    }),
    db.rmUren.findMany({
      where: { database, projectNr },
      orderBy: [{ medewerker: "asc" }, { datum: "desc" }],
    }),
    db.rmKostenRegel.findMany({
      where: { database, projectNr },
      orderBy: { datum: "desc" },
    }),
  ]);

  // Opbrengsten = typeRubriek B + W credits
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

  // Kosten-regels (AV_KOSTREG_2) — per categorie voor A/M/O toggles
  const kostenRegelsMapped = kostenRegels.map(k => ({
    typeBreg:      k.typeBreg,
    categorie:     k.categorie,
    datum:         k.datum ? toISO(k.datum) : null,
    omschrijving:  k.omschrijving ?? null,
    bedrag:        Number(k.bedrag ?? 0),
    dekkingen:     Number(k.dekkingen ?? 0),
    factuurStatus: k.factuurStatus ?? null,
    docCode:       k.docCode ?? null,
    creNaam:       k.creNaam ?? null,
  }));

  // Per-categorie totalen vanuit rm_project_summary (sneller dan regels tellen)
  // Als kostenRegels beschikbaar zijn, herbereken voor zekerheid
  let kostenArbeidCateg   = kostenACateg;
  let kostenMateriaalCateg = kostenMCateg;
  let kostenOverigCateg   = kostenOCateg;
  if (kostenRegels.length > 0) {
    kostenArbeidCateg   = 0;
    kostenMateriaalCateg = 0;
    kostenOverigCateg   = 0;
    for (const k of kostenRegelsMapped) {
      const bedrag = k.bedrag;
      if (k.categorie === "A") kostenArbeidCateg   += bedrag;
      else if (k.categorie === "M") kostenMateriaalCateg += bedrag;
      else kostenOverigCateg += bedrag;  // O en E
    }
  }

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
      nogTeFactureren,
      pctGefact,
      urenTotaal,
      urenTarief,
      algKostenPct,
      kostenMateriaal:  Number(rm.kostenMateriaal) || 0,
      kostenArbeid:     Number(rm.kostenArbeid)    || 0,
      kostenOverig:     Number(rm.kostenOverig)    || 0,
      kostenDirect,
      kostenPakbon,
      kostenIndirect,
      kostenAlgemeen,
      totaleKosten,
      brutomarge,
      margePct,
      // AV_KOSTREG_2 per-categorie (voor A/M/O toggles)
      kostenArbeidCateg,
      kostenMateriaalCateg,
      kostenOverigCateg,
    },
    kostenRegels:       kostenRegelsMapped,
    journaalOpbrengsten,
    urenDetail,
    urenPerMedewerker,
    _kostenPeriode: kostenRegels.length > 0 ? "gesynchroniseerde periode" : null,
  });
}

/** Realistic Dutch company mock data for Syntess Rapport */

export interface MockKlant {
  ID: number;
  KLANTNUMMER: string;
  NAAM: string;
  ADRES: string;
  POSTCODE: string;
  PLAATS: string;
  EMAIL: string;
  TELEFOON: string;
}

export interface MockProject {
  ID: number;
  PROJECTNUMMER: string;
  NAAM: string;
  KLANT_ID: number;
  KLANT: string;
  STATUS: "ACTIEF" | "AFGEROND" | "GEANNULEERD" | "ON_HOLD";
  STARTDATUM: string;
  EINDDATUM: string | null;
  PROJECTLEIDER: string;
  OMSCHRIJVING: string;
}

export interface MockWerkbon {
  ID: number;
  BONNUMMER: string;
  DATUM: string;
  STATUS: "NIEUW" | "IN_UITVOERING" | "AFGEROND" | "GEFACTUREERD";
  OMSCHRIJVING: string;
  TYPE: string;
  KLANT_ID: number;
  KLANT: string;               // Moederrelatie
  OBJECTLOCATIE: string;
  ADRES: string;
  FASE: string;
  UITVOERINGSDATUM: string | null;
  COORDINATOR: string;         // was MONTEUR
  PROJECT_ID: number | null;
  PROJECTNUMMER: string | null;
  PROJECT_NAAM: string | null;
  // Financieel
  KOSTEN: number;
  INDIRECT: number;            // 7.5% van KOSTEN
  ALGEMEEN: number;            // 5% van KOSTEN
  TOTALE_KOSTEN: number;
  OPBRENGSTEN: number;
  B_MARGE: number;
  MARGE_PCT: number;
  FACTUURNUMMER: string | null;
  FACTUURDATUM: string | null;
  BETAALD: string | null;      // datum of null
}

export interface MockFactuur {
  ID: number;
  FACTUURNUMMER: string;
  DATUM: string;
  VERVALDATUM: string;
  KLANT_ID: number;
  KLANT: string;
  PROJECT_ID: number | null;
  BEDRAG_EXCL: number;
  BTW: number;
  TOTAALBEDRAG: number;
  OPENSTAAND: number;
  STATUS: "OPEN" | "BETAALD" | "DEELS_BETAALD";
  DAGEN_OVERDUE: number;
}

export interface MockInkoopFactuur {
  ID: number;
  FACTUURNUMMER: string;
  DATUM: string;
  LEVERANCIER_ID: number;
  LEVERANCIER: string;
  PROJECT_ID: number | null;
  KOSTENSOORT_ID: number;
  BEDRAG_EXCL: number;
  BTW: number;
  TOTAALBEDRAG: number;
  STATUS: "NIEUW" | "GEBOEKT";
}

export interface MockGrootboekRubriek {
  ID: number;
  REKENINGNUMMER: string;
  OMSCHRIJVING: string;
  SOORT: "BALANS" | "RESULTAAT";
}

export interface MockGrootboekMutatie {
  ID: number;
  DATUM: string;
  OMSCHRIJVING: string;
  DEBET: number;
  CREDIT: number;
  RUBRIEK_ID: number;
  REKENINGNUMMER: string;
  RUBRIEK: string;
}

// AT_MEDEW — medewerkers (Syntess style)
export interface MockMedewerker {
  ID: number;
  GC_CODE: string;       // Syntess personeelsnummer
  NAAM: string;
  FUNCTIE: string;
  UURLOON: number;
  ACTIEF: boolean;
}

// AT_URENBREG — urenregistratie (Syntess style)
export interface MockUrenRegel {
  ID: number;
  DATUM: string;
  MEDEWERKER_ID: number;
  MEDEWERKER: string;
  GC_CODE: string;       // medewerkernummer
  WERK_GC_ID: number;    // project ID
  WERK_CODE: string;     // project code (AT_WERK.GC_CODE)
  WERK_NAAM: string;
  TAAK: string;          // taakomschrijving
  AANTAL: number;        // uren
  OMSCHRIJVING: string;
}

// ─── Klanten ─────────────────────────────────────────────────────────────────

export const KLANTEN: MockKlant[] = [
  { ID: 1, KLANTNUMMER: "KL-0001", NAAM: "Bouwbedrijf De Vries BV", ADRES: "Industrieweg 12", POSTCODE: "3542 AD", PLAATS: "Utrecht", EMAIL: "info@devries-bouw.nl", TELEFOON: "030-2345678" },
  { ID: 2, KLANTNUMMER: "KL-0002", NAAM: "Installatiebedrijf Jansen & Zn", ADRES: "Techniekstraat 5", POSTCODE: "2521 GH", PLAATS: "Den Haag", EMAIL: "service@jansen-installatie.nl", TELEFOON: "070-3456789" },
  { ID: 3, KLANTNUMMER: "KL-0003", NAAM: "Gemeente Rotterdam", ADRES: "Coolsingel 40", POSTCODE: "3011 AD", PLAATS: "Rotterdam", EMAIL: "inkoop@rotterdam.nl", TELEFOON: "010-2670000" },
  { ID: 4, KLANTNUMMER: "KL-0004", NAAM: "Woningcorporatie Wonen Plus", ADRES: "Woonlaan 88", POSTCODE: "5631 KJ", PLAATS: "Eindhoven", EMAIL: "onderhoud@wonenplus.nl", TELEFOON: "040-2345000" },
  { ID: 5, KLANTNUMMER: "KL-0005", NAAM: "Supermarkt Keten Holland BV", ADRES: "Logistiekweg 1", POSTCODE: "3825 AB", PLAATS: "Amersfoort", EMAIL: "fm@hollandsupermarkt.nl", TELEFOON: "033-4567890" },
  { ID: 6, KLANTNUMMER: "KL-0006", NAAM: "Ziekenhuis St. Antonius", ADRES: "Koekoekslaan 1", POSTCODE: "3435 CM", PLAATS: "Nieuwegein", EMAIL: "technischedienst@antonius.nl", TELEFOON: "030-6099111" },
  { ID: 7, KLANTNUMMER: "KL-0007", NAAM: "Vastgoed Groep Noord NV", ADRES: "Damrak 70", POSTCODE: "1012 LM", PLAATS: "Amsterdam", EMAIL: "beheer@vgn.nl", TELEFOON: "020-5551234" },
  { ID: 8, KLANTNUMMER: "KL-0008", NAAM: "Productiebedrijf Smit", ADRES: "Havenstraat 22", POSTCODE: "3115 HC", PLAATS: "Schiedam", EMAIL: "productie@smit-bv.nl", TELEFOON: "010-4267890" },
  { ID: 9, KLANTNUMMER: "KL-0009", NAAM: "Logistics Hub Brabant", ADRES: "Distributiepark 15", POSTCODE: "5047 RK", PLAATS: "Tilburg", EMAIL: "facility@lhb.nl", TELEFOON: "013-5678901" },
  { ID: 10, KLANTNUMMER: "KL-0010", NAAM: "Hotel Grand Palace", ADRES: "Stationsplein 9", POSTCODE: "6211 BP", PLAATS: "Maastricht", EMAIL: "techniek@grandpalace.nl", TELEFOON: "043-3210000" },
  { ID: 11, KLANTNUMMER: "KL-0011", NAAM: "Onderwijs Stichting West", ADRES: "Schoollaan 4", POSTCODE: "2033 GE", PLAATS: "Haarlem", EMAIL: "beheer@oswwest.nl", TELEFOON: "023-5678901" },
  { ID: 12, KLANTNUMMER: "KL-0012", NAAM: "Recreatiepark De Vlinder", ADRES: "Bosweg 78", POSTCODE: "7211 DE", PLAATS: "Eefde", EMAIL: "onderhoud@devlinder.nl", TELEFOON: "0575-456789" },
  { ID: 13, KLANTNUMMER: "KL-0013", NAAM: "Provinciehuis Gelderland", ADRES: "Markt 11", POSTCODE: "6811 CG", PLAATS: "Arnhem", EMAIL: "facilitair@gelderland.nl", TELEFOON: "026-3599999" },
  { ID: 14, KLANTNUMMER: "KL-0014", NAAM: "Chemie Plant Zeeland BV", ADRES: "Industriehaven 3", POSTCODE: "4389 PC", PLAATS: "Vlissingen", EMAIL: "maintenance@cpz.nl", TELEFOON: "0118-456789" },
  { ID: 15, KLANTNUMMER: "KL-0015", NAAM: "Retail Centrum Almere", ADRES: "Winkelboulevard 1", POSTCODE: "1315 JK", PLAATS: "Almere", EMAIL: "fm@rcalmere.nl", TELEFOON: "036-5432100" },
];

// ─── Projecten ────────────────────────────────────────────────────────────────

export const PROJECTEN: MockProject[] = [
  { ID: 1, PROJECTNUMMER: "P-2025-001", NAAM: "Renovatie installaties sporthal", KLANT_ID: 3, KLANT: "Gemeente Rotterdam", STATUS: "AFGEROND", STARTDATUM: "2025-01-15", EINDDATUM: "2025-04-30", PROJECTLEIDER: "M. van den Berg", OMSCHRIJVING: "Volledige renovatie elektra en sanitair sporthal Noord" },
  { ID: 2, PROJECTNUMMER: "P-2025-002", NAAM: "Nieuwbouw installaties kantoor", KLANT_ID: 7, KLANT: "Vastgoed Groep Noord NV", STATUS: "AFGEROND", STARTDATUM: "2025-02-01", EINDDATUM: "2025-06-15", PROJECTLEIDER: "S. Bakker", OMSCHRIJVING: "Installaties nieuwbouw kantoorpand Amsterdam Zuidas" },
  { ID: 3, PROJECTNUMMER: "P-2025-003", NAAM: "Onderhoud klimaatinstallaties", KLANT_ID: 6, KLANT: "Ziekenhuis St. Antonius", STATUS: "ACTIEF", STARTDATUM: "2025-03-01", EINDDATUM: "2025-12-31", PROJECTLEIDER: "R. Peeters", OMSCHRIJVING: "Jaarlijks onderhoud contract klimaatinstallaties" },
  { ID: 4, PROJECTNUMMER: "P-2025-004", NAAM: "Verduurzaming woningblokken", KLANT_ID: 4, KLANT: "Woningcorporatie Wonen Plus", STATUS: "ACTIEF", STARTDATUM: "2025-04-01", EINDDATUM: "2025-09-30", PROJECTLEIDER: "M. van den Berg", OMSCHRIJVING: "Plaatsen warmtepompen en zonnepanelen 120 woningen" },
  { ID: 5, PROJECTNUMMER: "P-2025-005", NAAM: "CV installatie ziekenhuis vleugel B", KLANT_ID: 6, KLANT: "Ziekenhuis St. Antonius", STATUS: "ACTIEF", STARTDATUM: "2025-05-01", EINDDATUM: "2026-02-28", PROJECTLEIDER: "S. Bakker", OMSCHRIJVING: "Nieuwe CV installatie vleugel B nieuwbouw" },
  { ID: 6, PROJECTNUMMER: "P-2025-006", NAAM: "Sprinklerinstallatie warehouse", KLANT_ID: 9, KLANT: "Logistics Hub Brabant", STATUS: "ACTIEF", STARTDATUM: "2025-05-15", EINDDATUM: "2025-10-31", PROJECTLEIDER: "T. Hendriks", OMSCHRIJVING: "Aanleg sprinklerinstallatie nieuw distributiecentrum" },
  { ID: 7, PROJECTNUMMER: "P-2025-007", NAAM: "Renovatie badkamers hotel", KLANT_ID: 10, KLANT: "Hotel Grand Palace", STATUS: "AFGEROND", STARTDATUM: "2025-01-10", EINDDATUM: "2025-03-28", PROJECTLEIDER: "T. Hendriks", OMSCHRIJVING: "Renovatie 40 badkamers inclusief loodgieterswerk" },
  { ID: 8, PROJECTNUMMER: "P-2025-008", NAAM: "Electra nieuwbouw scholen", KLANT_ID: 11, KLANT: "Onderwijs Stichting West", STATUS: "ACTIEF", STARTDATUM: "2025-06-01", EINDDATUM: "2026-01-31", PROJECTLEIDER: "R. Peeters", OMSCHRIJVING: "Elektrische installaties 3 nieuwe basisscholen" },
  { ID: 9, PROJECTNUMMER: "P-2025-009", NAAM: "Jaarlijks onderhoud supermarkten", KLANT_ID: 5, KLANT: "Supermarkt Keten Holland BV", STATUS: "ACTIEF", STARTDATUM: "2025-01-01", EINDDATUM: "2025-12-31", PROJECTLEIDER: "M. van den Berg", OMSCHRIJVING: "Onderhoud contract 22 vestigingen" },
  { ID: 10, PROJECTNUMMER: "P-2025-010", NAAM: "Pompstation renovatie", KLANT_ID: 14, KLANT: "Chemie Plant Zeeland BV", STATUS: "ACTIEF", STARTDATUM: "2025-07-01", EINDDATUM: "2025-11-30", PROJECTLEIDER: "S. Bakker", OMSCHRIJVING: "Renovatie pompstations proceswater" },
  { ID: 11, PROJECTNUMMER: "P-2025-011", NAAM: "Verlichting parkeergarage", KLANT_ID: 15, KLANT: "Retail Centrum Almere", STATUS: "AFGEROND", STARTDATUM: "2025-02-15", EINDDATUM: "2025-04-15", PROJECTLEIDER: "T. Hendriks", OMSCHRIJVING: "LED renovatie parkeergarage 3 verdiepingen" },
  { ID: 12, PROJECTNUMMER: "P-2025-012", NAAM: "Gasinstallaties recreatiepark", KLANT_ID: 12, KLANT: "Recreatiepark De Vlinder", STATUS: "GEANNULEERD", STARTDATUM: "2025-03-01", EINDDATUM: null, PROJECTLEIDER: "R. Peeters", OMSCHRIJVING: "Aanleg gasinfrastructuur nieuw deel park — geannuleerd" },
  { ID: 13, PROJECTNUMMER: "P-2026-001", NAAM: "Duurzaamheidsupgrade provincie", KLANT_ID: 13, KLANT: "Provinciehuis Gelderland", STATUS: "ACTIEF", STARTDATUM: "2026-01-15", EINDDATUM: "2026-08-31", PROJECTLEIDER: "M. van den Berg", OMSCHRIJVING: "Warmtepompen, zonnepanelen en smart building systeem" },
  { ID: 14, PROJECTNUMMER: "P-2026-002", NAAM: "Dakinstallaties woningblokken", KLANT_ID: 4, KLANT: "Woningcorporatie Wonen Plus", STATUS: "ACTIEF", STARTDATUM: "2026-02-01", EINDDATUM: "2026-07-31", PROJECTLEIDER: "S. Bakker", OMSCHRIJVING: "Zonnepanelen fase 2 — 85 woningen" },
  { ID: 15, PROJECTNUMMER: "P-2026-003", NAAM: "Electra uitbreiding productiehal", KLANT_ID: 8, KLANT: "Productiebedrijf Smit", STATUS: "ACTIEF", STARTDATUM: "2026-03-01", EINDDATUM: "2026-09-30", PROJECTLEIDER: "T. Hendriks", OMSCHRIJVING: "Uitbreiding elektrische installaties nieuwe hal 3" },
];

// ─── Werkbonnen ───────────────────────────────────────────────────────────────

function wb(
  id: number, nr: string, datum: string,
  status: MockWerkbon["STATUS"],
  omschrijving: string, type: string,
  klantId: number, klant: string, objectlocatie: string, adres: string,
  fase: string, uitvoeringsdatum: string | null,
  coordinator: string,
  projectId: number | null, projectnummer: string | null, projectNaam: string | null,
  kosten: number, opbrengsten: number,
  factuurnummer: string | null, factuurdatum: string | null, betaald: string | null
): MockWerkbon {
  const indirect  = Math.round(kosten * 0.075 * 100) / 100;
  const algemeen  = Math.round(kosten * 0.05  * 100) / 100;
  const totaal    = Math.round((kosten + indirect + algemeen) * 100) / 100;
  const marge     = Math.round((opbrengsten - totaal) * 100) / 100;
  const margeP    = opbrengsten > 0 ? Math.round((marge / opbrengsten) * 1000) / 10 : 0;
  return {
    ID: id, BONNUMMER: nr, DATUM: datum, STATUS: status,
    OMSCHRIJVING: omschrijving, TYPE: type,
    KLANT_ID: klantId, KLANT: klant, OBJECTLOCATIE: objectlocatie, ADRES: adres,
    FASE: fase, UITVOERINGSDATUM: uitvoeringsdatum, COORDINATOR: coordinator,
    PROJECT_ID: projectId, PROJECTNUMMER: projectnummer, PROJECT_NAAM: projectNaam,
    KOSTEN: kosten, INDIRECT: indirect, ALGEMEEN: algemeen,
    TOTALE_KOSTEN: totaal, OPBRENGSTEN: opbrengsten,
    B_MARGE: marge, MARGE_PCT: margeP,
    FACTUURNUMMER: factuurnummer, FACTUURDATUM: factuurdatum, BETAALD: betaald,
  };
}

export const WERKBONNEN: MockWerkbon[] = [
  wb(1,  "WB-2026-0312", "2026-05-10", "NIEUW",         "Lekkage CV ketel verdieping 3",           "Storingsdienst", 6,  "Ziekenhuis St. Antonius",      "Verpleegafdeling 3",    "Koekoekslaan 1, Nieuwegein",  "Uitvoering",  null,         "K. de Boer",  3,    "P-2025-003", "Onderhoud klimaatinstallaties",     285,   0,      null,          null,         null),
  wb(2,  "WB-2026-0311", "2026-05-09", "IN_UITVOERING", "Storing klimaatbeheersing serverruimte",  "Storingsdienst", 7,  "Vastgoed Groep Noord NV",      "Serverruimte B12",      "Damrak 70, Amsterdam",        "Uitvoering",  null,         "P. Willems",  null, null,         null,                                420,   0,      null,          null,         null),
  wb(3,  "WB-2026-0310", "2026-05-08", "AFGEROND",      "Jaarlijkse ketel inspectie",              "Onderhoud",      5,  "Supermarkt Keten Holland BV",  "Vestiging Amersfoort",  "Logistiekweg 1, Amersfoort",  "Oplevering",  "2026-05-08", "K. de Boer",  9,    "P-2025-009", "Jaarlijks onderhoud supermarkten",  310,   580,    "F-2026-0021", "2026-05-09", null),
  wb(4,  "WB-2026-0309", "2026-05-07", "GEFACTUREERD",  "Vervangen circulatiepomp",                "Reparatie",      4,  "Woningcorporatie Wonen Plus",  "Blok A woning 12",      "Woonlaan 88, Eindhoven",      "Oplevering",  "2026-05-07", "J. Meijer",   4,    "P-2025-004", "Verduurzaming woningblokken",        890,   1450,   "F-2026-0018", "2026-05-08", "2026-05-12"),
  wb(5,  "WB-2026-0308", "2026-05-06", "AFGEROND",      "Reparatie leidingbreuk kelder",           "Reparatie",      10, "Hotel Grand Palace",           "Kelder technische ruimte","Stationsplein 9, Maastricht", "Oplevering",  "2026-05-06", "P. Willems",  null, null,         null,                                640,   1100,   "F-2026-0020", "2026-05-07", "2026-05-10"),
  wb(6,  "WB-2026-0307", "2026-05-05", "IN_UITVOERING", "Installatie warmtepomp woning A12",       "Installatie",    4,  "Woningcorporatie Wonen Plus",  "Woning A12",            "Woonlaan 12A, Eindhoven",     "Uitvoering",  null,         "J. Meijer",   4,    "P-2025-004", "Verduurzaming woningblokken",        1240,  0,      null,          null,         null),
  wb(7,  "WB-2026-0306", "2026-05-04", "GEFACTUREERD",  "Preventief onderhoud sprinkler sectie 4", "Onderhoud",      9,  "Logistics Hub Brabant",        "Sectie 4 warehouse",    "Distributiepark 15, Tilburg", "Oplevering",  "2026-05-04", "K. de Boer",  6,    "P-2025-006", "Sprinklerinstallatie warehouse",     750,   1280,   "F-2026-0015", "2026-05-05", "2026-05-09"),
  wb(8,  "WB-2026-0305", "2026-05-02", "AFGEROND",      "Controleren en bijvullen koelmiddel",     "Onderhoud",      5,  "Supermarkt Keten Holland BV",  "Vestiging Utrecht",     "Kanaalstraat 4, Utrecht",     "Oplevering",  "2026-05-02", "P. Willems",  9,    "P-2025-009", "Jaarlijks onderhoud supermarkten",  195,   380,    "F-2026-0019", "2026-05-03", "2026-05-08"),
  wb(9,  "WB-2026-0304", "2026-04-30", "GEFACTUREERD",  "Noodaansluiting stroom na storing",       "Storingsdienst", 8,  "Productiebedrijf Smit",        "Hal 2 productievloer",  "Havenstraat 22, Schiedam",    "Oplevering",  "2026-04-30", "J. Meijer",   15,   "P-2026-003", "Electra uitbreiding productiehal",   580,   1050,   "F-2026-0016", "2026-05-01", "2026-05-06"),
  wb(10, "WB-2026-0303", "2026-04-29", "AFGEROND",      "Keuring elektrische installatie",         "Inspectie",      13, "Provinciehuis Gelderland",     "Vleugel Noord",         "Markt 11, Arnhem",            "Garantie",    "2026-04-29", "K. de Boer",  13,   "P-2026-001", "Duurzaamheidsupgrade provincie",     920,   1680,   "F-2026-0017", "2026-04-30", "2026-05-07"),
  wb(11, "WB-2026-0302", "2026-04-28", "NIEUW",         "Storing TL-verlichting parkeerkelder",    "Storingsdienst", 15, "Retail Centrum Almere",        "Parkeerkelder P2",      "Winkelboulevard 1, Almere",   "Uitvoering",  null,         "P. Willems",  null, null,         null,                                180,   0,      null,          null,         null),
  wb(12, "WB-2026-0301", "2026-04-25", "IN_UITVOERING", "Loodgieterswerk badkamers vleugel B",     "Installatie",    6,  "Ziekenhuis St. Antonius",      "Vleugel B 2e verdieping","Koekoekslaan 1, Nieuwegein",  "Uitvoering",  null,         "J. Meijer",   5,    "P-2025-005", "CV installatie ziekenhuis vleugel B",1850,  0,      null,          null,         null),
  wb(13, "WB-2026-0300", "2026-04-24", "AFGEROND",      "Montage zonnepanelen blok 7",             "Installatie",    4,  "Woningcorporatie Wonen Plus",  "Blok 7 dak",            "Woonlaan 88, Eindhoven",      "Oplevering",  "2026-04-24", "K. de Boer",  14,   "P-2026-002", "Dakinstallaties woningblokken",      2100,  3450,   "F-2026-0013", "2026-04-25", "2026-05-02"),
  wb(14, "WB-2026-0299", "2026-04-22", "GEFACTUREERD",  "Inregelen CV systeem woning B34",         "Reparatie",      4,  "Woningcorporatie Wonen Plus",  "Woning B34",            "Woonlaan 34B, Eindhoven",     "Oplevering",  "2026-04-22", "J. Meijer",   4,    "P-2025-004", "Verduurzaming woningblokken",        460,   820,    "F-2026-0012", "2026-04-23", "2026-04-28"),
  wb(15, "WB-2026-0298", "2026-04-20", "AFGEROND",      "Reparatie pompunit proceswater",          "Reparatie",      14, "Chemie Plant Zeeland BV",      "Pompstation 3",         "Industriehaven 3, Vlissingen","Garantie",    "2026-04-20", "P. Willems",  10,   "P-2025-010", "Pompstation renovatie",             1380,  2200,   "F-2026-0011", "2026-04-21", "2026-04-26"),
  wb(16, "WB-2026-0297", "2026-04-18", "GEFACTUREERD",  "Jaarlijks onderhoud luchtbehandeling",    "Onderhoud",      6,  "Ziekenhuis St. Antonius",      "Technische ruimte dak", "Koekoekslaan 1, Nieuwegein",  "Oplevering",  "2026-04-18", "K. de Boer",  3,    "P-2025-003", "Onderhoud klimaatinstallaties",      680,   1240,   "F-2026-0010", "2026-04-19", "2026-04-24"),
  wb(17, "WB-2026-0296", "2026-04-15", "AFGEROND",      "Vervanging brandmeldcentrale",            "Installatie",    11, "Onderwijs Stichting West",     "School de Regenboog",   "Schoollaan 4, Haarlem",       "Oplevering",  "2026-04-15", "P. Willems",  8,    "P-2025-008", "Electra nieuwbouw scholen",         1920,  3100,   "F-2026-0009", "2026-04-16", "2026-04-21"),
  wb(18, "WB-2026-0295", "2026-04-12", "GEFACTUREERD",  "Storing pompgroep sprinkler",             "Storingsdienst", 9,  "Logistics Hub Brabant",        "Sectie 2 magazijn",     "Distributiepark 15, Tilburg", "Oplevering",  "2026-04-12", "J. Meijer",   6,    "P-2025-006", "Sprinklerinstallatie warehouse",     340,   650,    "F-2026-0008", "2026-04-13", "2026-04-18"),
  wb(19, "WB-2026-0294", "2026-04-10", "AFGEROND",      "Isoleren cv-leidingen kelder",            "Onderhoud",      3,  "Gemeente Rotterdam",           "Sporthal Noord",        "Industrieweg 12, Rotterdam",  "Garantie",    "2026-04-10", "K. de Boer",  1,    "P-2025-001", "Renovatie installaties sporthal",    490,   780,    "F-2026-0007", "2026-04-11", "2026-04-16"),
  wb(20, "WB-2026-0293", "2026-04-08", "GEFACTUREERD",  "Plaatsen laadpaal electrisch rijden",     "Installatie",    7,  "Vastgoed Groep Noord NV",      "Parkeergarage P1",      "Damrak 70, Amsterdam",        "Oplevering",  "2026-04-08", "P. Willems",  2,    "P-2025-002", "Nieuwbouw installaties kantoor",     880,   1560,   "F-2026-0006", "2026-04-09", "2026-04-14"),
];

// ─── Facturen ─────────────────────────────────────────────────────────────────

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysOverdue(vervaldatum: string, openstaand: number): number {
  if (openstaand <= 0) return 0;
  const diff = Math.floor((Date.now() - new Date(vervaldatum).getTime()) / 86400000);
  return Math.max(0, diff);
}

const RAW_FACTUREN = [
  // Mei 2026 (huidige maand)
  { ID: 1, DATUM: "2026-05-02", KLANT_ID: 6,  BEDRAG_EXCL: 24800, PROJECT_ID: 5,  betaald: false },
  { ID: 2, DATUM: "2026-05-05", KLANT_ID: 13, BEDRAG_EXCL: 38500, PROJECT_ID: 13, betaald: false },
  { ID: 3, DATUM: "2026-05-08", KLANT_ID: 4,  BEDRAG_EXCL: 17200, PROJECT_ID: 14, betaald: true  },
  { ID: 4, DATUM: "2026-05-10", KLANT_ID: 8,  BEDRAG_EXCL: 11400, PROJECT_ID: 15, betaald: false },
  // April 2026
  { ID: 5,  DATUM: "2026-04-02", KLANT_ID: 3,  BEDRAG_EXCL: 18750, PROJECT_ID: 1,  betaald: true  },
  { ID: 6,  DATUM: "2026-04-05", KLANT_ID: 7,  BEDRAG_EXCL: 32400, PROJECT_ID: 2,  betaald: true  },
  { ID: 7,  DATUM: "2026-04-10", KLANT_ID: 6,  BEDRAG_EXCL: 9850,  PROJECT_ID: 3,  betaald: false },
  { ID: 8,  DATUM: "2026-04-12", KLANT_ID: 4,  BEDRAG_EXCL: 41200, PROJECT_ID: 4,  betaald: false },
  { ID: 9,  DATUM: "2026-04-14", KLANT_ID: 5,  BEDRAG_EXCL: 7620,  PROJECT_ID: 9,  betaald: true  },
  { ID: 10, DATUM: "2026-04-18", KLANT_ID: 9,  BEDRAG_EXCL: 15300, PROJECT_ID: 6,  betaald: false },
  { ID: 11, DATUM: "2026-04-20", KLANT_ID: 10, BEDRAG_EXCL: 5450,  PROJECT_ID: 7,  betaald: true  },
  { ID: 12, DATUM: "2026-04-22", KLANT_ID: 11, BEDRAG_EXCL: 22100, PROJECT_ID: 8,  betaald: false },
  { ID: 13, DATUM: "2026-04-25", KLANT_ID: 8,  BEDRAG_EXCL: 8900,  PROJECT_ID: 15, betaald: false },
  { ID: 14, DATUM: "2026-04-28", KLANT_ID: 13, BEDRAG_EXCL: 61500, PROJECT_ID: 13, betaald: false },
  // Maart 2026
  { ID: 15, DATUM: "2026-03-05", KLANT_ID: 6,  BEDRAG_EXCL: 12350, PROJECT_ID: 3,    betaald: true  },
  { ID: 16, DATUM: "2026-03-10", KLANT_ID: 4,  BEDRAG_EXCL: 38600, PROJECT_ID: 4,    betaald: true  },
  { ID: 17, DATUM: "2026-03-15", KLANT_ID: 5,  BEDRAG_EXCL: 7890,  PROJECT_ID: 9,    betaald: false, deels: true },
  { ID: 18, DATUM: "2026-03-20", KLANT_ID: 14, BEDRAG_EXCL: 25400, PROJECT_ID: 10,   betaald: false },
  { ID: 19, DATUM: "2026-03-25", KLANT_ID: 3,  BEDRAG_EXCL: 9100,  PROJECT_ID: 1,    betaald: true  },
  // Februari 2026
  { ID: 20, DATUM: "2026-02-08", KLANT_ID: 7,  BEDRAG_EXCL: 44200, PROJECT_ID: 2,    betaald: true  },
  { ID: 21, DATUM: "2026-02-14", KLANT_ID: 12, BEDRAG_EXCL: 3450,  PROJECT_ID: null, betaald: false },
  { ID: 22, DATUM: "2026-02-20", KLANT_ID: 15, BEDRAG_EXCL: 18750, PROJECT_ID: 11,   betaald: true  },
  { ID: 23, DATUM: "2026-02-25", KLANT_ID: 9,  BEDRAG_EXCL: 31200, PROJECT_ID: 6,    betaald: false },
  // Januari 2026
  { ID: 24, DATUM: "2026-01-15", KLANT_ID: 6,  BEDRAG_EXCL: 14500, PROJECT_ID: 3,    betaald: true  },
  { ID: 25, DATUM: "2026-01-20", KLANT_ID: 4,  BEDRAG_EXCL: 52300, PROJECT_ID: 4,    betaald: true  },
  { ID: 26, DATUM: "2026-01-28", KLANT_ID: 1,  BEDRAG_EXCL: 8750,  PROJECT_ID: null, betaald: false },
  // 2025
  { ID: 27, DATUM: "2025-12-10", KLANT_ID: 2,  BEDRAG_EXCL: 5200,  PROJECT_ID: null, betaald: true  },
  { ID: 28, DATUM: "2025-12-18", KLANT_ID: 5,  BEDRAG_EXCL: 9100,  PROJECT_ID: 9,    betaald: true  },
  { ID: 29, DATUM: "2025-11-22", KLANT_ID: 13, BEDRAG_EXCL: 74000, PROJECT_ID: null, betaald: false },
];

export const FACTUREN: MockFactuur[] = RAW_FACTUREN.map((r, i) => {
  const klant = KLANTEN.find(k => k.ID === r.KLANT_ID)!;
  const btw = Math.round(r.BEDRAG_EXCL * 0.21 * 100) / 100;
  const totaal = r.BEDRAG_EXCL + btw;
  const vervaldatum = addDays(r.DATUM, 30);
  const openstaand = r.betaald ? 0 : (r.deels ? Math.round(totaal * 0.5) : totaal);
  return {
    ID: r.ID,
    FACTUURNUMMER: `F-2026-${String(i + 1).padStart(4, "0")}`,
    DATUM: r.DATUM,
    VERVALDATUM: vervaldatum,
    KLANT_ID: r.KLANT_ID,
    KLANT: klant.NAAM,
    PROJECT_ID: r.PROJECT_ID,
    BEDRAG_EXCL: r.BEDRAG_EXCL,
    BTW: btw,
    TOTAALBEDRAG: totaal,
    OPENSTAAND: openstaand,
    STATUS: r.betaald ? "BETAALD" : r.deels ? "DEELS_BETAALD" : "OPEN",
    DAGEN_OVERDUE: daysOverdue(vervaldatum, openstaand),
  };
});

// ─── Inkoop / Leveranciers ────────────────────────────────────────────────────

const LEVERANCIERS = [
  { ID: 1, NAAM: "TechniekGrossier NL BV" },
  { ID: 2, NAAM: "Warmtepomp Specialist BV" },
  { ID: 3, NAAM: "Elektra Groothandel West" },
  { ID: 4, NAAM: "Loodgieter Supplies BV" },
  { ID: 5, NAAM: "Kabel & Draad Direct" },
  { ID: 6, NAAM: "Klimaatcentrum Holland" },
];

export const KOSTENSOORTEN = [
  { ID: 1, OMSCHRIJVING: "Materialen" },
  { ID: 2, OMSCHRIJVING: "Onderdelen" },
  { ID: 3, OMSCHRIJVING: "Inhuur personeel" },
  { ID: 4, OMSCHRIJVING: "Transport" },
  { ID: 5, OMSCHRIJVING: "Gereedschap" },
  { ID: 6, OMSCHRIJVING: "Overig" },
];

const RAW_INKOOP = [
  { ID: 1, DATUM: "2026-05-08", LEV_ID: 2, KS_ID: 2, BEDRAG_EXCL: 8400, PROJECT_ID: 4 },
  { ID: 2, DATUM: "2026-05-06", LEV_ID: 3, KS_ID: 1, BEDRAG_EXCL: 3200, PROJECT_ID: 8 },
  { ID: 3, DATUM: "2026-05-05", LEV_ID: 1, KS_ID: 2, BEDRAG_EXCL: 5600, PROJECT_ID: 6 },
  { ID: 4, DATUM: "2026-04-28", LEV_ID: 4, KS_ID: 1, BEDRAG_EXCL: 1450, PROJECT_ID: 3 },
  { ID: 5, DATUM: "2026-04-25", LEV_ID: 2, KS_ID: 2, BEDRAG_EXCL: 12800, PROJECT_ID: 13 },
  { ID: 6, DATUM: "2026-04-22", LEV_ID: 5, KS_ID: 1, BEDRAG_EXCL: 2100, PROJECT_ID: 15 },
  { ID: 7, DATUM: "2026-04-18", LEV_ID: 6, KS_ID: 2, BEDRAG_EXCL: 6700, PROJECT_ID: 5 },
  { ID: 8, DATUM: "2026-04-15", LEV_ID: 3, KS_ID: 4, BEDRAG_EXCL: 890, PROJECT_ID: null },
  { ID: 9, DATUM: "2026-04-10", LEV_ID: 1, KS_ID: 1, BEDRAG_EXCL: 4300, PROJECT_ID: 10 },
  { ID: 10, DATUM: "2026-04-05", LEV_ID: 4, KS_ID: 3, BEDRAG_EXCL: 9600, PROJECT_ID: 6 },
  { ID: 11, DATUM: "2026-03-28", LEV_ID: 2, KS_ID: 2, BEDRAG_EXCL: 7800, PROJECT_ID: 14 },
  { ID: 12, DATUM: "2026-03-20", LEV_ID: 6, KS_ID: 2, BEDRAG_EXCL: 5100, PROJECT_ID: 3 },
  { ID: 13, DATUM: "2026-03-15", LEV_ID: 5, KS_ID: 1, BEDRAG_EXCL: 3400, PROJECT_ID: 8 },
  { ID: 14, DATUM: "2026-03-10", LEV_ID: 3, KS_ID: 5, BEDRAG_EXCL: 1200, PROJECT_ID: null },
  { ID: 15, DATUM: "2026-02-25", LEV_ID: 1, KS_ID: 1, BEDRAG_EXCL: 6200, PROJECT_ID: 15 },
];

export const INKOOPFACTUREN: MockInkoopFactuur[] = RAW_INKOOP.map((r, i) => {
  const lev = LEVERANCIERS.find(l => l.ID === r.LEV_ID)!;
  const btw = Math.round(r.BEDRAG_EXCL * 0.21 * 100) / 100;
  return {
    ID: r.ID,
    FACTUURNUMMER: `INK-2026-${String(i + 1).padStart(4, "0")}`,
    DATUM: r.DATUM,
    LEVERANCIER_ID: r.LEV_ID,
    LEVERANCIER: lev.NAAM,
    PROJECT_ID: r.PROJECT_ID,
    KOSTENSOORT_ID: r.KS_ID,
    BEDRAG_EXCL: r.BEDRAG_EXCL,
    BTW: btw,
    TOTAALBEDRAG: r.BEDRAG_EXCL + btw,
    STATUS: r.ID <= 10 ? "GEBOEKT" : "NIEUW",
  };
});

// ─── Grootboek ────────────────────────────────────────────────────────────────

export const GROOTBOEK_RUBRIEKEN: MockGrootboekRubriek[] = [
  { ID: 1, REKENINGNUMMER: "0100", OMSCHRIJVING: "Gebouwen", SOORT: "BALANS" },
  { ID: 2, REKENINGNUMMER: "0200", OMSCHRIJVING: "Inventaris", SOORT: "BALANS" },
  { ID: 3, REKENINGNUMMER: "1000", OMSCHRIJVING: "Kas", SOORT: "BALANS" },
  { ID: 4, REKENINGNUMMER: "1300", OMSCHRIJVING: "Debiteuren", SOORT: "BALANS" },
  { ID: 5, REKENINGNUMMER: "1400", OMSCHRIJVING: "Crediteuren", SOORT: "BALANS" },
  { ID: 6, REKENINGNUMMER: "8000", OMSCHRIJVING: "Omzet dienstverlening", SOORT: "RESULTAAT" },
  { ID: 7, REKENINGNUMMER: "8100", OMSCHRIJVING: "Omzet materiaalverkoop", SOORT: "RESULTAAT" },
  { ID: 8, REKENINGNUMMER: "9000", OMSCHRIJVING: "Inkoopkosten", SOORT: "RESULTAAT" },
  { ID: 9, REKENINGNUMMER: "9100", OMSCHRIJVING: "Personeelskosten", SOORT: "RESULTAAT" },
  { ID: 10, REKENINGNUMMER: "9200", OMSCHRIJVING: "Huisvestingskosten", SOORT: "RESULTAAT" },
  { ID: 11, REKENINGNUMMER: "9300", OMSCHRIJVING: "Autokosten", SOORT: "RESULTAAT" },
  { ID: 12, REKENINGNUMMER: "9400", OMSCHRIJVING: "Overige bedrijfskosten", SOORT: "RESULTAAT" },
];

export const GROOTBOEK_MUTATIES: MockGrootboekMutatie[] = [
  { ID: 1, DATUM: "2026-05-10", OMSCHRIJVING: "Betaling factuur F-2026-0002", DEBET: 0, CREDIT: 39204, RUBRIEK_ID: 4, REKENINGNUMMER: "1300", RUBRIEK: "Debiteuren" },
  { ID: 2, DATUM: "2026-05-10", OMSCHRIJVING: "Betaling factuur F-2026-0002", DEBET: 39204, CREDIT: 0, RUBRIEK_ID: 3, REKENINGNUMMER: "1000", RUBRIEK: "Kas" },
  { ID: 3, DATUM: "2026-05-08", OMSCHRIJVING: "Inkoop warmtepompen", DEBET: 10164, CREDIT: 0, RUBRIEK_ID: 8, REKENINGNUMMER: "9000", RUBRIEK: "Inkoopkosten" },
  { ID: 4, DATUM: "2026-05-08", OMSCHRIJVING: "Inkoop warmtepompen", DEBET: 0, CREDIT: 10164, RUBRIEK_ID: 5, REKENINGNUMMER: "1400", RUBRIEK: "Crediteuren" },
  { ID: 5, DATUM: "2026-05-05", OMSCHRIJVING: "Verkoopfactuur ZA-003 april", DEBET: 11918.50, CREDIT: 0, RUBRIEK_ID: 4, REKENINGNUMMER: "1300", RUBRIEK: "Debiteuren" },
  { ID: 6, DATUM: "2026-05-05", OMSCHRIJVING: "Verkoopfactuur ZA-003 april", DEBET: 0, CREDIT: 9850, RUBRIEK_ID: 6, REKENINGNUMMER: "8000", RUBRIEK: "Omzet dienstverlening" },
  { ID: 7, DATUM: "2026-04-30", OMSCHRIJVING: "Salarisbetalingen april", DEBET: 48500, CREDIT: 0, RUBRIEK_ID: 9, REKENINGNUMMER: "9100", RUBRIEK: "Personeelskosten" },
  { ID: 8, DATUM: "2026-04-30", OMSCHRIJVING: "Salarisbetalingen april", DEBET: 0, CREDIT: 48500, RUBRIEK_ID: 3, REKENINGNUMMER: "1000", RUBRIEK: "Kas" },
  { ID: 9, DATUM: "2026-04-15", OMSCHRIJVING: "Huur kantoorpand april", DEBET: 3200, CREDIT: 0, RUBRIEK_ID: 10, REKENINGNUMMER: "9200", RUBRIEK: "Huisvestingskosten" },
  { ID: 10, DATUM: "2026-04-15", OMSCHRIJVING: "Huur kantoorpand april", DEBET: 0, CREDIT: 3200, RUBRIEK_ID: 3, REKENINGNUMMER: "1000", RUBRIEK: "Kas" },
  { ID: 11, DATUM: "2026-04-10", OMSCHRIJVING: "Betaling debiteur Gemeente Rotterdam", DEBET: 0, CREDIT: 22712.50, RUBRIEK_ID: 4, REKENINGNUMMER: "1300", RUBRIEK: "Debiteuren" },
  { ID: 12, DATUM: "2026-04-10", OMSCHRIJVING: "Betaling debiteur Gemeente Rotterdam", DEBET: 22712.50, CREDIT: 0, RUBRIEK_ID: 3, REKENINGNUMMER: "1000", RUBRIEK: "Kas" },
  { ID: 13, DATUM: "2026-03-31", OMSCHRIJVING: "Salarisbetalingen maart", DEBET: 48500, CREDIT: 0, RUBRIEK_ID: 9, REKENINGNUMMER: "9100", RUBRIEK: "Personeelskosten" },
  { ID: 14, DATUM: "2026-03-31", OMSCHRIJVING: "Salarisbetalingen maart", DEBET: 0, CREDIT: 48500, RUBRIEK_ID: 3, REKENINGNUMMER: "1000", RUBRIEK: "Kas" },
  { ID: 15, DATUM: "2026-03-20", OMSCHRIJVING: "Lease bedrijfswagens Q1", DEBET: 4800, CREDIT: 0, RUBRIEK_ID: 11, REKENINGNUMMER: "9300", RUBRIEK: "Autokosten" },
  { ID: 16, DATUM: "2026-03-20", OMSCHRIJVING: "Lease bedrijfswagens Q1", DEBET: 0, CREDIT: 4800, RUBRIEK_ID: 3, REKENINGNUMMER: "1000", RUBRIEK: "Kas" },
];

// ─── Medewerkers (AT_MEDEW) ───────────────────────────────────────────────────

export const MEDEWERKERS: MockMedewerker[] = [
  { ID: 1, GC_CODE: "EMP-001", NAAM: "K. de Boer",    FUNCTIE: "Monteur elektra",     UURLOON: 62, ACTIEF: true  },
  { ID: 2, GC_CODE: "EMP-002", NAAM: "P. Willems",    FUNCTIE: "Monteur loodgieter",  UURLOON: 58, ACTIEF: true  },
  { ID: 3, GC_CODE: "EMP-003", NAAM: "J. Meijer",     FUNCTIE: "Installateur",        UURLOON: 65, ACTIEF: true  },
  { ID: 4, GC_CODE: "EMP-004", NAAM: "M. van den Berg",FUNCTIE: "Projectleider",      UURLOON: 85, ACTIEF: true  },
  { ID: 5, GC_CODE: "EMP-005", NAAM: "S. Bakker",     FUNCTIE: "Projectleider",       UURLOON: 85, ACTIEF: true  },
  { ID: 6, GC_CODE: "EMP-006", NAAM: "T. Hendriks",   FUNCTIE: "Uitvoerder",          UURLOON: 72, ACTIEF: true  },
  { ID: 7, GC_CODE: "EMP-007", NAAM: "R. Peeters",    FUNCTIE: "Werkvoorbereider",    UURLOON: 68, ACTIEF: true  },
  { ID: 8, GC_CODE: "EMP-008", NAAM: "A. Visser",     FUNCTIE: "Monteur elektra",     UURLOON: 58, ACTIEF: false },
];

// ─── Uren (AT_URENBREG) ────────────────────────────────────────────────────────


function uur(id: number, datum: string, medId: number, medNaam: string, gcCode: string,
             werkId: number, werkCode: string, werkNaam: string,
             taak: string, aantal: number, omschr: string): MockUrenRegel {
  return { ID: id, DATUM: datum, MEDEWERKER_ID: medId, MEDEWERKER: medNaam, GC_CODE: gcCode,
           WERK_GC_ID: werkId, WERK_CODE: werkCode, WERK_NAAM: werkNaam,
           TAAK: taak, AANTAL: aantal, OMSCHRIJVING: omschr };
}

export const UREN: MockUrenRegel[] = [
  // Mei 2026 — week 19 (13-17 mei)
  uur(1,  "2026-05-13", 1,"K. de Boer",  "EMP-001", 3,"P-2025-003","Onderhoud klimaatinstallaties", "Onderhoud",   8,   "Preventief onderhoud AHU-02"),
  uur(2,  "2026-05-13", 2,"P. Willems",  "EMP-002", 5,"P-2025-005","CV installatie ziekenhuis vleugel B","Installatie",7.5,"Leidingwerk vleugel B verdieping 2"),
  uur(3,  "2026-05-13", 3,"J. Meijer",   "EMP-003", 4,"P-2025-004","Verduurzaming woningblokken",   "Montage",     8,   "Warmtepomp plaatsen woning B22"),
  uur(4,  "2026-05-14", 1,"K. de Boer",  "EMP-001", 3,"P-2025-003","Onderhoud klimaatinstallaties", "Storingsdienst",6,"Storing CV ketel vleugel A gerepareerd"),
  uur(5,  "2026-05-14", 2,"P. Willems",  "EMP-002", 5,"P-2025-005","CV installatie ziekenhuis vleugel B","Installatie",8,"CV-leidingen isoleren vleugel B"),
  uur(6,  "2026-05-14", 6,"T. Hendriks", "EMP-006", 6,"P-2025-006","Sprinklerinstallatie warehouse","Inspectie",   8,   "Druktest sprinklerleiding sectie 3"),
  uur(7,  "2026-05-15", 3,"J. Meijer",   "EMP-003", 4,"P-2025-004","Verduurzaming woningblokken",   "Montage",     8,   "Warmtepomp woning B22 inbedrijfstelling"),
  uur(8,  "2026-05-15", 1,"K. de Boer",  "EMP-001", 13,"P-2026-001","Duurzaamheidsupgrade provincie","Installatie",8,  "Zonnepanelen vleugel Noord — aansluiting"),
  uur(9,  "2026-05-15", 6,"T. Hendriks", "EMP-006", 6,"P-2025-006","Sprinklerinstallatie warehouse","Montage",     7.5,"Sprinklerkop montage rij 12-18"),
  uur(10, "2026-05-16", 2,"P. Willems",  "EMP-002", 5,"P-2025-005","CV installatie ziekenhuis vleugel B","Reparatie",4, "Lek in aanvoerleiding gerepareerd"),
  uur(11, "2026-05-16", 4,"M. van den Berg","EMP-004",4,"P-2025-004","Verduurzaming woningblokken","Werkvoorbereiding",3,"Planning fase 3 woningblokken C en D"),
  uur(12, "2026-05-16", 1,"K. de Boer",  "EMP-001", 13,"P-2026-001","Duurzaamheidsupgrade provincie","Installatie",8,  "Omvormer en bekabeling dak"),
  uur(13, "2026-05-17", 3,"J. Meijer",   "EMP-003", 14,"P-2026-002","Dakinstallaties woningblokken","Montage",     8,   "Zonnepanelen blok 9 montage"),
  uur(14, "2026-05-17", 6,"T. Hendriks", "EMP-006", 6,"P-2025-006","Sprinklerinstallatie warehouse","Oplevering",  6,   "Oplevering sectie 1-3 met opdrachtgever"),
  // Week 18 (6-10 mei)
  uur(15, "2026-05-06", 1,"K. de Boer",  "EMP-001", 9,"P-2025-009","Jaarlijks onderhoud supermarkten","Onderhoud",  8,  "Ketelonderhoud vestiging Breda"),
  uur(16, "2026-05-07", 2,"P. Willems",  "EMP-002", 4,"P-2025-004","Verduurzaming woningblokken",   "Montage",     8,   "Warmtepomp woning A14 plaatsen"),
  uur(17, "2026-05-07", 3,"J. Meijer",   "EMP-003", 15,"P-2026-003","Electra uitbreiding productiehal","Installatie",8,"Kabelgoot hal 3 aanleggen"),
  uur(18, "2026-05-08", 1,"K. de Boer",  "EMP-001", 9,"P-2025-009","Jaarlijks onderhoud supermarkten","Onderhoud",  7,  "Koelmiddelcontrole + bijvullen Amersfoort"),
  uur(19, "2026-05-08", 6,"T. Hendriks", "EMP-006", 8,"P-2025-008","Electra nieuwbouw scholen",     "Montage",     8,   "Groepenkast school 2 plaatsen"),
  uur(20, "2026-05-09", 2,"P. Willems",  "EMP-002", 10,"P-2025-010","Pompstation renovatie",         "Reparatie",   8,  "Pompunit 3 revisie"),
  uur(21, "2026-05-09", 3,"J. Meijer",   "EMP-003", 15,"P-2026-003","Electra uitbreiding productiehal","Installatie",8,"Verdeler hal 3 aansluiten"),
  uur(22, "2026-05-10", 5,"S. Bakker",   "EMP-005", 5,"P-2025-005","CV installatie ziekenhuis vleugel B","Werkvoorbereiding",4,"Tekeningen vleugel C voorbereiden"),
  uur(23, "2026-05-10", 1,"K. de Boer",  "EMP-001", 3,"P-2025-003","Onderhoud klimaatinstallaties","Storingsdienst",5, "Noodoproep storing koudegroep OK-5"),
  // April
  uur(24, "2026-04-28", 2,"P. Willems",  "EMP-002", 4,"P-2025-004","Verduurzaming woningblokken",   "Montage",     8,   "Warmtepomp blok B plaatsen"),
  uur(25, "2026-04-29", 1,"K. de Boer",  "EMP-001", 13,"P-2026-001","Duurzaamheidsupgrade provincie","Installatie",8,  "Bekabeling zonnepanelen dak oost"),
  uur(26, "2026-04-30", 3,"J. Meijer",   "EMP-003", 6,"P-2025-006","Sprinklerinstallatie warehouse","Montage",     8,   "Sectie 4 sprinklers monteren"),
  uur(27, "2026-04-30", 6,"T. Hendriks", "EMP-006", 8,"P-2025-008","Electra nieuwbouw scholen",     "Inspectie",   4,   "Oplevering school 1 elektrische keuring"),
  uur(28, "2026-04-25", 5,"S. Bakker",   "EMP-005", 14,"P-2026-002","Dakinstallaties woningblokken","Werkvoorbereiding",6,"Offerte materialen fase 2"),
  uur(29, "2026-04-24", 1,"K. de Boer",  "EMP-001", 9,"P-2025-009","Jaarlijks onderhoud supermarkten","Onderhoud",  8,  "Jaarinspectie vestiging Utrecht"),
  uur(30, "2026-04-23", 2,"P. Willems",  "EMP-002", 5,"P-2025-005","CV installatie ziekenhuis vleugel B","Installatie",8,"Radiatoren vleugel B verdieping 1"),
];

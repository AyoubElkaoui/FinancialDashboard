// Elmar financial project mock data — 4 Firebird databases

export type Database = "SERVICES" | "MAINTENANCE" | "INTERNATIONAL" | "KEYSER";
export type ProjectStatus = "ACTIEF" | "AFGEROND" | "GEANNULEERD" | "ON_HOLD";
export type FactuurStatus = "BETAALD" | "DEELS_BETAALD" | "OPEN";

export interface Termijn {
  NR: number;
  OMSCHRIJVING: string;
  BEDRAG: number;
  NOG_TE_VERSTUREN: boolean; // true = not yet invoiced
  DATUM_VERWACHT?: string;
}

export interface Factuur {
  FACTUURNUMMER: string;
  DATUM: string;
  BEDRAG_EXCL: number;
  STATUS: FactuurStatus;
  BETAALD_BEDRAG: number;
}

export interface ElmarProject {
  ID: number;
  DATABASE: Database;
  PROJECTNUMMER: string;
  NAAM: string;
  KLANT: string;
  PROJECTLEIDER: string;
  STATUS: ProjectStatus;
  STARTDATUM: string;
  EINDDATUM: string | null;
  AANNEEMSOM: number;
  MEERWERK: number;
  TERMIJNEN: Termijn[];
  FACTUREN: Factuur[];
  DIRECTE_KOSTEN: number;
  UREN_AANTAL: number;
  UREN_TARIEF: number;
  ALG_KOSTEN_PCT: number;
  OPMERKINGEN: string;
}

// ─── SERVICES (4 projecten) ───────────────────────────────────────────────────

const SERVICES_PROJECTEN: ElmarProject[] = [
  {
    ID: 101,
    DATABASE: "SERVICES",
    PROJECTNUMMER: "SVC-2024-001",
    NAAM: "Jaarlijks onderhoudscontract – Havenbedrijf Rotterdam",
    KLANT: "Havenbedrijf Rotterdam NV",
    PROJECTLEIDER: "Jan de Vries",
    STATUS: "ACTIEF",
    STARTDATUM: "2024-01-01",
    EINDDATUM: "2024-12-31",
    AANNEEMSOM: 320_000,
    MEERWERK: 18_500,
    TERMIJNEN: [
      { NR: 1, OMSCHRIJVING: "Q1 2024 – Preventief onderhoud",  BEDRAG: 84_625, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-03-31" },
      { NR: 2, OMSCHRIJVING: "Q2 2024 – Preventief onderhoud",  BEDRAG: 84_625, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-06-30" },
      { NR: 3, OMSCHRIJVING: "Q3 2024 – Preventief onderhoud",  BEDRAG: 84_625, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-09-30" },
      { NR: 4, OMSCHRIJVING: "Q4 2024 – Preventief onderhoud",  BEDRAG: 84_625, NOG_TE_VERSTUREN: true,  DATUM_VERWACHT: "2024-12-31" },
    ],
    FACTUREN: [
      { FACTUURNUMMER: "F2024-10101", DATUM: "2024-03-31", BEDRAG_EXCL: 84_625, STATUS: "BETAALD",      BETAALD_BEDRAG: 84_625 },
      { FACTUURNUMMER: "F2024-10207", DATUM: "2024-06-30", BEDRAG_EXCL: 84_625, STATUS: "BETAALD",      BETAALD_BEDRAG: 84_625 },
      { FACTUURNUMMER: "F2024-10318", DATUM: "2024-09-30", BEDRAG_EXCL: 84_625, STATUS: "DEELS_BETAALD", BETAALD_BEDRAG: 50_000 },
    ],
    DIRECTE_KOSTEN: 195_000,
    UREN_AANTAL: 420,
    UREN_TARIEF: 85,
    ALG_KOSTEN_PCT: 6,
    OPMERKINGEN: "Inclusief 24/7 storingsdienst. Contract loopt jaarlijks door. Meerwerk betreft vervanging van kleppen in Q3.",
  },
  {
    ID: 102,
    DATABASE: "SERVICES",
    PROJECTNUMMER: "SVC-2024-012",
    NAAM: "Brandmeldinstallatie revisie – AZ Ziekenhuis Delft",
    KLANT: "Stichting AZ Ziekenhuis Delft",
    PROJECTLEIDER: "Mirjam Kok",
    STATUS: "AFGEROND",
    STARTDATUM: "2024-02-15",
    EINDDATUM: "2024-05-30",
    AANNEEMSOM: 128_000,
    MEERWERK: 4_250,
    TERMIJNEN: [
      { NR: 1, OMSCHRIJVING: "Startbetaling – mobilisatie",   BEDRAG: 25_600,  NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-02-15" },
      { NR: 2, OMSCHRIJVING: "Fase 1 – installatie",          BEDRAG: 64_000,  NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-04-01" },
      { NR: 3, OMSCHRIJVING: "Oplevering – eindkeuring",      BEDRAG: 38_400,  NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-05-30" },
      { NR: 4, OMSCHRIJVING: "Meerwerk – extra detectoren",   BEDRAG: 4_250,   NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-05-30" },
    ],
    FACTUREN: [
      { FACTUURNUMMER: "F2024-10089", DATUM: "2024-02-15", BEDRAG_EXCL: 25_600,  STATUS: "BETAALD", BETAALD_BEDRAG: 25_600 },
      { FACTUURNUMMER: "F2024-10155", DATUM: "2024-04-03", BEDRAG_EXCL: 64_000,  STATUS: "BETAALD", BETAALD_BEDRAG: 64_000 },
      { FACTUURNUMMER: "F2024-10289", DATUM: "2024-05-31", BEDRAG_EXCL: 42_650,  STATUS: "BETAALD", BETAALD_BEDRAG: 42_650 },
    ],
    DIRECTE_KOSTEN: 82_000,
    UREN_AANTAL: 310,
    UREN_TARIEF: 90,
    ALG_KOSTEN_PCT: 5,
    OPMERKINGEN: "Project succesvol opgeleverd. NEN 2535 keuring geslaagd. Eindrapport verstuurd naar opdrachtgever.",
  },
  {
    ID: 103,
    DATABASE: "SERVICES",
    PROJECTNUMMER: "SVC-2025-003",
    NAAM: "Koelinstallatie onderhoud – Lidl DC Bleiswijk",
    KLANT: "Lidl Nederland GmbH",
    PROJECTLEIDER: "Thomas Bakker",
    STATUS: "ACTIEF",
    STARTDATUM: "2025-01-01",
    EINDDATUM: "2025-12-31",
    AANNEEMSOM: 215_000,
    MEERWERK: 7_800,
    TERMIJNEN: [
      { NR: 1, OMSCHRIJVING: "Jan–Mar 2025",  BEDRAG: 55_700, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2025-03-31" },
      { NR: 2, OMSCHRIJVING: "Apr–Jun 2025",  BEDRAG: 55_700, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2025-06-30" },
      { NR: 3, OMSCHRIJVING: "Jul–Sep 2025",  BEDRAG: 55_700, NOG_TE_VERSTUREN: true,  DATUM_VERWACHT: "2025-09-30" },
      { NR: 4, OMSCHRIJVING: "Okt–Dec 2025",  BEDRAG: 55_700, NOG_TE_VERSTUREN: true,  DATUM_VERWACHT: "2025-12-31" },
    ],
    FACTUREN: [
      { FACTUURNUMMER: "F2025-10044", DATUM: "2025-03-31", BEDRAG_EXCL: 55_700, STATUS: "BETAALD",       BETAALD_BEDRAG: 55_700 },
      { FACTUURNUMMER: "F2025-10112", DATUM: "2025-06-30", BEDRAG_EXCL: 55_700, STATUS: "DEELS_BETAALD", BETAALD_BEDRAG: 30_000 },
    ],
    DIRECTE_KOSTEN: 125_000,
    UREN_AANTAL: 520,
    UREN_TARIEF: 82,
    ALG_KOSTEN_PCT: 5.5,
    OPMERKINGEN: "Inclusief Freon-monitoring en ammoniakdetectie. Storing in april opgelost onder garantie.",
  },
  {
    ID: 104,
    DATABASE: "SERVICES",
    PROJECTNUMMER: "SVC-2023-019",
    NAAM: "HVAC servicecontract – Gemeente Den Haag",
    KLANT: "Gemeente Den Haag",
    PROJECTLEIDER: "Sandra Visser",
    STATUS: "ON_HOLD",
    STARTDATUM: "2023-07-01",
    EINDDATUM: "2024-06-30",
    AANNEEMSOM: 89_500,
    MEERWERK: 0,
    TERMIJNEN: [
      { NR: 1, OMSCHRIJVING: "H2 2023",   BEDRAG: 44_750, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2023-12-31" },
      { NR: 2, OMSCHRIJVING: "H1 2024",   BEDRAG: 44_750, NOG_TE_VERSTUREN: true,  DATUM_VERWACHT: "2024-06-30" },
    ],
    FACTUREN: [
      { FACTUURNUMMER: "F2023-10421", DATUM: "2024-01-05", BEDRAG_EXCL: 44_750, STATUS: "OPEN", BETAALD_BEDRAG: 0 },
    ],
    DIRECTE_KOSTEN: 58_000,
    UREN_AANTAL: 180,
    UREN_TARIEF: 78,
    ALG_KOSTEN_PCT: 5,
    OPMERKINGEN: "Project on hold door bezuinigingen gemeente. H2 2023 factuur nog onbetaald – aanmaning verstuurd. Heroverweging contract verwacht Q3 2025.",
  },
];

// ─── MAINTENANCE (4 projecten) ────────────────────────────────────────────────

const MAINTENANCE_PROJECTEN: ElmarProject[] = [
  {
    ID: 201,
    DATABASE: "MAINTENANCE",
    PROJECTNUMMER: "MNT-2024-007",
    NAAM: "Renovatie stookruimte – Woonzorgcentrum De Hofstede",
    KLANT: "Zorginstellingen West BV",
    PROJECTLEIDER: "Peter Smit",
    STATUS: "AFGEROND",
    STARTDATUM: "2024-03-01",
    EINDDATUM: "2024-08-15",
    AANNEEMSOM: 485_000,
    MEERWERK: 32_000,
    TERMIJNEN: [
      { NR: 1, OMSCHRIJVING: "Aanbetaling – contracttekening",   BEDRAG: 97_000,  NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-03-01" },
      { NR: 2, OMSCHRIJVING: "Sloop en voorbereiding",           BEDRAG: 121_250, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-04-15" },
      { NR: 3, OMSCHRIJVING: "Plaatsing nieuwe installatie",     BEDRAG: 145_500, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-06-30" },
      { NR: 4, OMSCHRIJVING: "Afronding en oplevering",          BEDRAG: 121_250, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-08-15" },
      { NR: 5, OMSCHRIJVING: "Meerwerk – asbest sanering extra", BEDRAG: 32_000,  NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-08-15" },
    ],
    FACTUREN: [
      { FACTUURNUMMER: "F2024-20091", DATUM: "2024-03-01", BEDRAG_EXCL: 97_000,  STATUS: "BETAALD",      BETAALD_BEDRAG: 97_000 },
      { FACTUURNUMMER: "F2024-20143", DATUM: "2024-04-16", BEDRAG_EXCL: 121_250, STATUS: "BETAALD",      BETAALD_BEDRAG: 121_250 },
      { FACTUURNUMMER: "F2024-20221", DATUM: "2024-07-02", BEDRAG_EXCL: 145_500, STATUS: "BETAALD",      BETAALD_BEDRAG: 145_500 },
      { FACTUURNUMMER: "F2024-20298", DATUM: "2024-08-20", BEDRAG_EXCL: 153_250, STATUS: "DEELS_BETAALD", BETAALD_BEDRAG: 100_000 },
    ],
    DIRECTE_KOSTEN: 298_000,
    UREN_AANTAL: 1_240,
    UREN_TARIEF: 88,
    ALG_KOSTEN_PCT: 6,
    OPMERKINGEN: "Asbestsanering extra meerwerk door onverwachte vondst. GGD-keuring succesvol afgerond. Restant factuur nog te ontvangen.",
  },
  {
    ID: 202,
    DATABASE: "MAINTENANCE",
    PROJECTNUMMER: "MNT-2025-001",
    NAAM: "Vervanging dakbedekkingsinstallatie – Floralis Kantoorpark",
    KLANT: "Floralis Vastgoed BV",
    PROJECTLEIDER: "Jan de Vries",
    STATUS: "ACTIEF",
    STARTDATUM: "2025-02-01",
    EINDDATUM: "2025-07-31",
    AANNEEMSOM: 765_000,
    MEERWERK: 45_000,
    TERMIJNEN: [
      { NR: 1, OMSCHRIJVING: "Aanbetaling 20%",                BEDRAG: 153_000, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2025-02-01" },
      { NR: 2, OMSCHRIJVING: "Start uitvoering",               BEDRAG: 191_250, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2025-03-15" },
      { NR: 3, OMSCHRIJVING: "50% gereed",                     BEDRAG: 191_250, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2025-05-01" },
      { NR: 4, OMSCHRIJVING: "Oplevering",                     BEDRAG: 229_500, NOG_TE_VERSTUREN: true,  DATUM_VERWACHT: "2025-07-31" },
      { NR: 5, OMSCHRIJVING: "Meerwerk dakranden",             BEDRAG: 45_000,  NOG_TE_VERSTUREN: true,  DATUM_VERWACHT: "2025-07-31" },
    ],
    FACTUREN: [
      { FACTUURNUMMER: "F2025-20011", DATUM: "2025-02-01", BEDRAG_EXCL: 153_000, STATUS: "BETAALD",       BETAALD_BEDRAG: 153_000 },
      { FACTUURNUMMER: "F2025-20078", DATUM: "2025-03-17", BEDRAG_EXCL: 191_250, STATUS: "BETAALD",       BETAALD_BEDRAG: 191_250 },
      { FACTUURNUMMER: "F2025-20155", DATUM: "2025-05-02", BEDRAG_EXCL: 191_250, STATUS: "DEELS_BETAALD", BETAALD_BEDRAG: 100_000 },
    ],
    DIRECTE_KOSTEN: 450_000,
    UREN_AANTAL: 1_850,
    UREN_TARIEF: 86,
    ALG_KOSTEN_PCT: 5.5,
    OPMERKINGEN: "Meerwerk dakranden door extra ventilatie-eisen omgevingsvergunning. Project loopt op schema.",
  },
  {
    ID: 203,
    DATABASE: "MAINTENANCE",
    PROJECTNUMMER: "MNT-2024-022",
    NAAM: "E-installatie renovatie – Winkelcentrum Zuidplein",
    KLANT: "Unibail-Rodamco-Westfield NL",
    PROJECTLEIDER: "Mirjam Kok",
    STATUS: "ACTIEF",
    STARTDATUM: "2024-09-01",
    EINDDATUM: "2025-03-31",
    AANNEEMSOM: 1_150_000,
    MEERWERK: 88_000,
    TERMIJNEN: [
      { NR: 1, OMSCHRIJVING: "Mobilisatie en engineering",   BEDRAG: 230_000, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-09-01" },
      { NR: 2, OMSCHRIJVING: "Fase 1 – parkeergarage",       BEDRAG: 287_500, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-11-01" },
      { NR: 3, OMSCHRIJVING: "Fase 2 – winkelzone A",        BEDRAG: 287_500, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2025-01-15" },
      { NR: 4, OMSCHRIJVING: "Fase 3 – winkelzone B+C",      BEDRAG: 345_000, NOG_TE_VERSTUREN: true,  DATUM_VERWACHT: "2025-03-31" },
      { NR: 5, OMSCHRIJVING: "Meerwerk noodverlichting",     BEDRAG: 88_000,  NOG_TE_VERSTUREN: true,  DATUM_VERWACHT: "2025-03-31" },
    ],
    FACTUREN: [
      { FACTUURNUMMER: "F2024-20311", DATUM: "2024-09-02", BEDRAG_EXCL: 230_000, STATUS: "BETAALD",       BETAALD_BEDRAG: 230_000 },
      { FACTUURNUMMER: "F2024-20398", DATUM: "2024-11-04", BEDRAG_EXCL: 287_500, STATUS: "BETAALD",       BETAALD_BEDRAG: 287_500 },
      { FACTUURNUMMER: "F2025-20044", DATUM: "2025-01-16", BEDRAG_EXCL: 287_500, STATUS: "OPEN",          BETAALD_BEDRAG: 0 },
    ],
    DIRECTE_KOSTEN: 720_000,
    UREN_AANTAL: 2_400,
    UREN_TARIEF: 90,
    ALG_KOSTEN_PCT: 5,
    OPMERKINGEN: "Groot project – uitvoering in 3 fasen. Fase 3 factuur Q1 2025. Meerwerk noodverlichting goedgekeurd door opdrachtgever d.d. 15-12-2024.",
  },
  {
    ID: 204,
    DATABASE: "MAINTENANCE",
    PROJECTNUMMER: "MNT-2023-034",
    NAAM: "Dakgoot- en hemelwaterinstallatie – Bedrijventerrein Oosterhout",
    KLANT: "Gebroeders Van Loon Vastgoed",
    PROJECTLEIDER: "Thomas Bakker",
    STATUS: "GEANNULEERD",
    STARTDATUM: "2023-10-01",
    EINDDATUM: "2024-02-28",
    AANNEEMSOM: 165_000,
    MEERWERK: 0,
    TERMIJNEN: [
      { NR: 1, OMSCHRIJVING: "Aanbetaling",   BEDRAG: 33_000,  NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2023-10-01" },
      { NR: 2, OMSCHRIJVING: "Halfjaar",      BEDRAG: 99_000,  NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2023-12-01" },
      { NR: 3, OMSCHRIJVING: "Oplevering",    BEDRAG: 33_000,  NOG_TE_VERSTUREN: true,  DATUM_VERWACHT: "2024-02-28" },
    ],
    FACTUREN: [
      { FACTUURNUMMER: "F2023-20554", DATUM: "2023-10-05", BEDRAG_EXCL: 33_000, STATUS: "BETAALD", BETAALD_BEDRAG: 33_000 },
    ],
    DIRECTE_KOSTEN: 28_000,
    UREN_AANTAL: 60,
    UREN_TARIEF: 80,
    ALG_KOSTEN_PCT: 5,
    OPMERKINGEN: "Project geannuleerd door opdrachtgever na faillissement. Annuleringskosten in rekening gebracht. Aanbetaling ontvangen.",
  },
];

// ─── INTERNATIONAL (3 projecten) ─────────────────────────────────────────────

const INTERNATIONAL_PROJECTEN: ElmarProject[] = [
  {
    ID: 301,
    DATABASE: "INTERNATIONAL",
    PROJECTNUMMER: "INT-2024-005",
    NAAM: "Klimaatinstallatie distributiecentrum – Antwerpen Linkeroever",
    KLANT: "DHL Supply Chain Belgium NV",
    PROJECTLEIDER: "Jan de Vries",
    STATUS: "AFGEROND",
    STARTDATUM: "2024-04-01",
    EINDDATUM: "2024-10-31",
    AANNEEMSOM: 920_000,
    MEERWERK: 54_000,
    TERMIJNEN: [
      { NR: 1, OMSCHRIJVING: "Aanbetaling 20%",           BEDRAG: 184_000, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-04-01" },
      { NR: 2, OMSCHRIJVING: "Engineering gereed",        BEDRAG: 184_000, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-05-15" },
      { NR: 3, OMSCHRIJVING: "Montage 50%",               BEDRAG: 230_000, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-07-31" },
      { NR: 4, OMSCHRIJVING: "Montage 100%",              BEDRAG: 230_000, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-09-30" },
      { NR: 5, OMSCHRIJVING: "Oplevering en meerwerk",    BEDRAG: 146_000, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-10-31" },
    ],
    FACTUREN: [
      { FACTUURNUMMER: "F2024-30041", DATUM: "2024-04-02", BEDRAG_EXCL: 184_000, STATUS: "BETAALD", BETAALD_BEDRAG: 184_000 },
      { FACTUURNUMMER: "F2024-30089", DATUM: "2024-05-17", BEDRAG_EXCL: 184_000, STATUS: "BETAALD", BETAALD_BEDRAG: 184_000 },
      { FACTUURNUMMER: "F2024-30178", DATUM: "2024-08-01", BEDRAG_EXCL: 230_000, STATUS: "BETAALD", BETAALD_BEDRAG: 230_000 },
      { FACTUURNUMMER: "F2024-30241", DATUM: "2024-10-01", BEDRAG_EXCL: 230_000, STATUS: "BETAALD", BETAALD_BEDRAG: 230_000 },
      { FACTUURNUMMER: "F2024-30299", DATUM: "2024-11-05", BEDRAG_EXCL: 146_000, STATUS: "BETAALD", BETAALD_BEDRAG: 146_000 },
    ],
    DIRECTE_KOSTEN: 570_000,
    UREN_AANTAL: 2_100,
    UREN_TARIEF: 95,
    ALG_KOSTEN_PCT: 5,
    OPMERKINGEN: "Project volledig betaald. Belgische BTW-aangifte verwerkt. Eindrapport DHL goedgekeurd. Meerwerk betreft extra koeldrumdepots op verzoek DHL.",
  },
  {
    ID: 302,
    DATABASE: "INTERNATIONAL",
    PROJECTNUMMER: "INT-2025-002",
    NAAM: "Procesinstallatie – BASF Ludwigshafen (Duitsland)",
    KLANT: "BASF SE",
    PROJECTLEIDER: "Sandra Visser",
    STATUS: "ACTIEF",
    STARTDATUM: "2025-01-15",
    EINDDATUM: "2025-09-30",
    AANNEEMSOM: 1_180_000,
    MEERWERK: 62_000,
    TERMIJNEN: [
      { NR: 1, OMSCHRIJVING: "Aanbetaling 15%",        BEDRAG: 177_000, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2025-01-15" },
      { NR: 2, OMSCHRIJVING: "Engineering fase",        BEDRAG: 236_000, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2025-03-01" },
      { NR: 3, OMSCHRIJVING: "Prefab en fabricage",     BEDRAG: 295_000, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2025-05-01" },
      { NR: 4, OMSCHRIJVING: "Montage on-site",         BEDRAG: 354_000, NOG_TE_VERSTUREN: true,  DATUM_VERWACHT: "2025-08-01" },
      { NR: 5, OMSCHRIJVING: "FAT + Oplevering + meerwerk", BEDRAG: 180_000, NOG_TE_VERSTUREN: true, DATUM_VERWACHT: "2025-09-30" },
    ],
    FACTUREN: [
      { FACTUURNUMMER: "F2025-30012", DATUM: "2025-01-16", BEDRAG_EXCL: 177_000, STATUS: "BETAALD",       BETAALD_BEDRAG: 177_000 },
      { FACTUURNUMMER: "F2025-30067", DATUM: "2025-03-03", BEDRAG_EXCL: 236_000, STATUS: "BETAALD",       BETAALD_BEDRAG: 236_000 },
      { FACTUURNUMMER: "F2025-30134", DATUM: "2025-05-05", BEDRAG_EXCL: 295_000, STATUS: "DEELS_BETAALD", BETAALD_BEDRAG: 200_000 },
    ],
    DIRECTE_KOSTEN: 720_000,
    UREN_AANTAL: 3_200,
    UREN_TARIEF: 98,
    ALG_KOSTEN_PCT: 5.5,
    OPMERKINGEN: "Groot Duits contract. Werkt conform PED-richtlijn. VAT-aangifte Duitsland via fiscaal adviseur. Fase 3 factuur gedeeltelijk betaald, restant verwacht voor 15-06-2025.",
  },
  {
    ID: 303,
    DATABASE: "INTERNATIONAL",
    PROJECTNUMMER: "INT-2024-011",
    NAAM: "Brandbeveiliging logistiek centrum – Luik (België)",
    KLANT: "Amazon EU SARL",
    PROJECTLEIDER: "Peter Smit",
    STATUS: "ACTIEF",
    STARTDATUM: "2024-11-01",
    EINDDATUM: "2025-05-31",
    AANNEEMSOM: 830_000,
    MEERWERK: 0,
    TERMIJNEN: [
      { NR: 1, OMSCHRIJVING: "Aanbetaling",        BEDRAG: 166_000, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-11-01" },
      { NR: 2, OMSCHRIJVING: "Engineeringsfase",   BEDRAG: 207_500, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2025-01-15" },
      { NR: 3, OMSCHRIJVING: "Installatie 50%",    BEDRAG: 207_500, NOG_TE_VERSTUREN: true,  DATUM_VERWACHT: "2025-03-31" },
      { NR: 4, OMSCHRIJVING: "Installatie 100%",   BEDRAG: 249_000, NOG_TE_VERSTUREN: true,  DATUM_VERWACHT: "2025-05-31" },
    ],
    FACTUREN: [
      { FACTUURNUMMER: "F2024-30378", DATUM: "2024-11-04", BEDRAG_EXCL: 166_000, STATUS: "BETAALD", BETAALD_BEDRAG: 166_000 },
      { FACTUURNUMMER: "F2025-30022", DATUM: "2025-01-17", BEDRAG_EXCL: 207_500, STATUS: "OPEN",    BETAALD_BEDRAG: 0 },
    ],
    DIRECTE_KOSTEN: 510_000,
    UREN_AANTAL: 1_680,
    UREN_TARIEF: 92,
    ALG_KOSTEN_PCT: 5,
    OPMERKINGEN: "Amazon-project met strikte planning. Installatie conform NFPA 13. Fase 2 factuur nog onbetaald – Amazon betaalt doorgaans netto 60 dagen.",
  },
];

// ─── KEYSER (4 projecten) ─────────────────────────────────────────────────────

const KEYSER_PROJECTEN: ElmarProject[] = [
  {
    ID: 401,
    DATABASE: "KEYSER",
    PROJECTNUMMER: "KEY-2024-008",
    NAAM: "Keyser – Totaalrenovatie installaties kantoorgebouw Helmond",
    KLANT: "Regio Helmond Vastgoed BV",
    PROJECTLEIDER: "Thomas Bakker",
    STATUS: "AFGEROND",
    STARTDATUM: "2024-01-15",
    EINDDATUM: "2024-09-30",
    AANNEEMSOM: 580_000,
    MEERWERK: 22_500,
    TERMIJNEN: [
      { NR: 1, OMSCHRIJVING: "Aanbetaling 20%",         BEDRAG: 116_000, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-01-15" },
      { NR: 2, OMSCHRIJVING: "Ruwbouw gereed",           BEDRAG: 145_000, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-03-31" },
      { NR: 3, OMSCHRIJVING: "Installaties 50%",         BEDRAG: 145_000, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-06-30" },
      { NR: 4, OMSCHRIJVING: "Oplevering",               BEDRAG: 174_000, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-09-30" },
      { NR: 5, OMSCHRIJVING: "Meerwerk extra verdieping", BEDRAG: 22_500, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-09-30" },
    ],
    FACTUREN: [
      { FACTUURNUMMER: "F2024-40051", DATUM: "2024-01-16", BEDRAG_EXCL: 116_000, STATUS: "BETAALD",      BETAALD_BEDRAG: 116_000 },
      { FACTUURNUMMER: "F2024-40132", DATUM: "2024-04-02", BEDRAG_EXCL: 145_000, STATUS: "BETAALD",      BETAALD_BEDRAG: 145_000 },
      { FACTUURNUMMER: "F2024-40208", DATUM: "2024-07-01", BEDRAG_EXCL: 145_000, STATUS: "BETAALD",      BETAALD_BEDRAG: 145_000 },
      { FACTUURNUMMER: "F2024-40289", DATUM: "2024-10-01", BEDRAG_EXCL: 196_500, STATUS: "DEELS_BETAALD", BETAALD_BEDRAG: 150_000 },
    ],
    DIRECTE_KOSTEN: 355_000,
    UREN_AANTAL: 1_560,
    UREN_TARIEF: 87,
    ALG_KOSTEN_PCT: 6,
    OPMERKINGEN: "Succesvol opgeleverd. Restant op laatste factuur ad €46.500 verwacht voor 01-12-2024. Garantieperiode loopt tot 01-10-2026.",
  },
  {
    ID: 402,
    DATABASE: "KEYSER",
    PROJECTNUMMER: "KEY-2025-002",
    NAAM: "Keyser – Nieuwbouw productiehal Eindhoven",
    KLANT: "Bosch Rexroth BV",
    PROJECTLEIDER: "Sandra Visser",
    STATUS: "ACTIEF",
    STARTDATUM: "2025-03-01",
    EINDDATUM: "2025-12-31",
    AANNEEMSOM: 1_050_000,
    MEERWERK: 78_500,
    TERMIJNEN: [
      { NR: 1, OMSCHRIJVING: "Contracttekening",         BEDRAG: 210_000, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2025-03-01" },
      { NR: 2, OMSCHRIJVING: "Fundering en staalwerk",   BEDRAG: 262_500, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2025-05-15" },
      { NR: 3, OMSCHRIJVING: "Installaties fase A",      BEDRAG: 262_500, NOG_TE_VERSTUREN: true,  DATUM_VERWACHT: "2025-08-01" },
      { NR: 4, OMSCHRIJVING: "Installaties fase B + meerwerk", BEDRAG: 315_000, NOG_TE_VERSTUREN: true, DATUM_VERWACHT: "2025-11-01" },
      { NR: 5, OMSCHRIJVING: "Oplevering en nazorg",     BEDRAG: 78_500,  NOG_TE_VERSTUREN: true,  DATUM_VERWACHT: "2025-12-31" },
    ],
    FACTUREN: [
      { FACTUURNUMMER: "F2025-40019", DATUM: "2025-03-03", BEDRAG_EXCL: 210_000, STATUS: "BETAALD",       BETAALD_BEDRAG: 210_000 },
      { FACTUURNUMMER: "F2025-40088", DATUM: "2025-05-16", BEDRAG_EXCL: 262_500, STATUS: "DEELS_BETAALD", BETAALD_BEDRAG: 150_000 },
    ],
    DIRECTE_KOSTEN: 650_000,
    UREN_AANTAL: 2_800,
    UREN_TARIEF: 90,
    ALG_KOSTEN_PCT: 5.5,
    OPMERKINGEN: "Bosch Rexroth-project met specifieke veiligheidseisen. Meerwerk sprinklerinstallatie door gewijzigde indeling productiehal. Planning op koers.",
  },
  {
    ID: 403,
    DATABASE: "KEYSER",
    PROJECTNUMMER: "KEY-2024-019",
    NAAM: "Keyser – Warmtepomp renovatie appartementen Tilburg",
    KLANT: "Woonbedrijf Tilburg",
    PROJECTLEIDER: "Mirjam Kok",
    STATUS: "ACTIEF",
    STARTDATUM: "2024-08-01",
    EINDDATUM: "2025-06-30",
    AANNEEMSOM: 415_000,
    MEERWERK: 12_000,
    TERMIJNEN: [
      { NR: 1, OMSCHRIJVING: "Start – aanbetaling",  BEDRAG: 83_000,  NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-08-01" },
      { NR: 2, OMSCHRIJVING: "Blok A+B gereed",      BEDRAG: 103_750, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2024-10-31" },
      { NR: 3, OMSCHRIJVING: "Blok C+D gereed",      BEDRAG: 103_750, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2025-02-28" },
      { NR: 4, OMSCHRIJVING: "Blok E + meerwerk",    BEDRAG: 124_500, NOG_TE_VERSTUREN: true,  DATUM_VERWACHT: "2025-06-30" },
    ],
    FACTUREN: [
      { FACTUURNUMMER: "F2024-40321", DATUM: "2024-08-05", BEDRAG_EXCL: 83_000,  STATUS: "BETAALD",       BETAALD_BEDRAG: 83_000 },
      { FACTUURNUMMER: "F2024-40412", DATUM: "2024-11-04", BEDRAG_EXCL: 103_750, STATUS: "BETAALD",       BETAALD_BEDRAG: 103_750 },
      { FACTUURNUMMER: "F2025-40031", DATUM: "2025-03-05", BEDRAG_EXCL: 103_750, STATUS: "OPEN",          BETAALD_BEDRAG: 0 },
    ],
    DIRECTE_KOSTEN: 258_000,
    UREN_AANTAL: 920,
    UREN_TARIEF: 84,
    ALG_KOSTEN_PCT: 5,
    OPMERKINGEN: "Warmtepomp-project in het kader van aardgasvrije wijk. Subsidie via RVO voor rekening opdrachtgever. Fase 3 factuur te laat – herinneringsmail verstuurd.",
  },
  {
    ID: 404,
    DATABASE: "KEYSER",
    PROJECTNUMMER: "KEY-2023-044",
    NAAM: "Keyser – Technische dienst jaarcontract Heerlen",
    KLANT: "Limburgse Werkgevers Associatie",
    PROJECTLEIDER: "Jan de Vries",
    STATUS: "AFGEROND",
    STARTDATUM: "2023-01-01",
    EINDDATUM: "2023-12-31",
    AANNEEMSOM: 95_000,
    MEERWERK: 5_500,
    TERMIJNEN: [
      { NR: 1, OMSCHRIJVING: "H1 2023",    BEDRAG: 50_250, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2023-06-30" },
      { NR: 2, OMSCHRIJVING: "H2 2023 + meerwerk", BEDRAG: 50_250, NOG_TE_VERSTUREN: false, DATUM_VERWACHT: "2023-12-31" },
    ],
    FACTUREN: [
      { FACTUURNUMMER: "F2023-40188", DATUM: "2023-07-03", BEDRAG_EXCL: 50_250, STATUS: "BETAALD", BETAALD_BEDRAG: 50_250 },
      { FACTUURNUMMER: "F2024-40006", DATUM: "2024-01-05", BEDRAG_EXCL: 50_250, STATUS: "BETAALD", BETAALD_BEDRAG: 50_250 },
    ],
    DIRECTE_KOSTEN: 62_000,
    UREN_AANTAL: 230,
    UREN_TARIEF: 80,
    ALG_KOSTEN_PCT: 5,
    OPMERKINGEN: "Volledig afgerond en betaald. Contract niet verlengd door opdrachtgever (interne reorganisatie). Projectevaluatie positief.",
  },
];

// ─── All projects map ─────────────────────────────────────────────────────────

const ALL_PROJECTS: Record<Database, ElmarProject[]> = {
  SERVICES:      SERVICES_PROJECTEN,
  MAINTENANCE:   MAINTENANCE_PROJECTEN,
  INTERNATIONAL: INTERNATIONAL_PROJECTEN,
  KEYSER:        KEYSER_PROJECTEN,
};

// ─── Computed rapport interface ───────────────────────────────────────────────

export interface ElmarRapport extends ElmarProject {
  TOTAAL_AANNEEMSOM: number;
  INDIRECTE_KOSTEN: number;
  ALG_KOSTEN: number;
  TOTALE_KOSTEN: number;
  GEFACTUREERD_TOTAAL: number;
  BETAALD_TOTAAL: number;
  ONBETAALD_TOTAAL: number;
  PCT_BETAALD: number;
  BRUTOMARGE: number;
  MARGE_PCT: number;
}

export interface ElmarProjectSummary {
  ID: number;
  DATABASE: Database;
  PROJECTNUMMER: string;
  NAAM: string;
  KLANT: string;
  PROJECTLEIDER: string;
  STATUS: ProjectStatus;
  STARTDATUM: string;
  EINDDATUM: string | null;
  AANNEEMSOM: number;
  MEERWERK: number;
  TOTAAL_AANNEEMSOM: number;
  GEFACTUREERD_TOTAAL: number;
  BETAALD_TOTAAL: number;
  PCT_BETAALD: number;
  BRUTOMARGE: number;
  MARGE_PCT: number;
  TOTALE_KOSTEN: number;
}

function computeRapport(project: ElmarProject): ElmarRapport {
  const TOTAAL_AANNEEMSOM = project.AANNEEMSOM + project.MEERWERK;
  const INDIRECTE_KOSTEN  = project.UREN_AANTAL * project.UREN_TARIEF;
  const ALG_KOSTEN        = Math.round(project.DIRECTE_KOSTEN * project.ALG_KOSTEN_PCT / 100 * 100) / 100;
  const TOTALE_KOSTEN     = project.DIRECTE_KOSTEN + INDIRECTE_KOSTEN + ALG_KOSTEN;
  const GEFACTUREERD_TOTAAL = project.FACTUREN.reduce((s, f) => s + f.BEDRAG_EXCL, 0);
  const BETAALD_TOTAAL    = project.FACTUREN.reduce((s, f) => s + f.BETAALD_BEDRAG, 0);
  const ONBETAALD_TOTAAL  = Math.round((GEFACTUREERD_TOTAAL - BETAALD_TOTAAL) * 100) / 100;
  const PCT_BETAALD       = GEFACTUREERD_TOTAAL > 0 ? Math.round(BETAALD_TOTAAL / GEFACTUREERD_TOTAAL * 10000) / 100 : 0;
  const BRUTOMARGE        = Math.round((GEFACTUREERD_TOTAAL - TOTALE_KOSTEN) * 100) / 100;
  const MARGE_PCT         = GEFACTUREERD_TOTAAL > 0 ? Math.round(BRUTOMARGE / GEFACTUREERD_TOTAAL * 10000) / 100 : 0;

  return {
    ...project,
    TOTAAL_AANNEEMSOM,
    INDIRECTE_KOSTEN,
    ALG_KOSTEN,
    TOTALE_KOSTEN,
    GEFACTUREERD_TOTAAL,
    BETAALD_TOTAAL,
    ONBETAALD_TOTAAL,
    PCT_BETAALD,
    BRUTOMARGE,
    MARGE_PCT,
  };
}

/**
 * Get the full financial rapport for a project by ID and database.
 */
export function getElmarRapport(id: number, database: string): ElmarRapport | null {
  const db = database as Database;
  const projects = ALL_PROJECTS[db] ?? [];
  const project = projects.find((p) => p.ID === id);
  if (!project) return null;
  return computeRapport(project);
}

// ─── Derived data helpers (dashboard, facturen, inkoop) ──────────────────────

export interface FlatFactuur {
  ID: number;
  FACTUURNUMMER: string;
  DATUM: string;
  VERVALDATUM: string;
  KLANT: string;
  PROJECT_ID: number;
  PROJECTNUMMER: string;
  BEDRAG_EXCL: number;
  BTW: number;
  TOTAALBEDRAG: number;
  BETAALD_BEDRAG: number;
  OPENSTAAND: number;
  STATUS: FactuurStatus;
  DAGEN_OVERDUE: number;
}

function daysOverdue(datum: string): number {
  const due = new Date(datum);
  due.setDate(due.getDate() + 30); // net 30 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86400000));
}

// Deterministic "random" based on string seed (no Math.random in server code)
function deterministicVariance(seed: string, range = 0.4): number {
  const hash = seed.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffffff, 0);
  return 1 + ((hash % 1000) / 1000 - 0.5) * range;
}

export function getDbFacturen(database: string): FlatFactuur[] {
  const projects = ALL_PROJECTS[database as Database] ?? [];
  const dbIdx = ["SERVICES", "MAINTENANCE", "INTERNATIONAL", "KEYSER"].indexOf(database);
  let id = (dbIdx + 1) * 1000;

  return projects
    .flatMap((project) =>
      project.FACTUREN.map((f) => {
        const openstaand = Math.max(0, Math.round((f.BEDRAG_EXCL - f.BETAALD_BEDRAG) * 100) / 100);
        const vd = new Date(f.DATUM);
        vd.setDate(vd.getDate() + 30);
        return {
          ID: ++id,
          FACTUURNUMMER: f.FACTUURNUMMER,
          DATUM: f.DATUM,
          VERVALDATUM: vd.toISOString().slice(0, 10),
          KLANT: project.KLANT,
          PROJECT_ID: project.ID,
          PROJECTNUMMER: project.PROJECTNUMMER,
          BEDRAG_EXCL: f.BEDRAG_EXCL,
          BTW: Math.round(f.BEDRAG_EXCL * 0.21 * 100) / 100,
          TOTAALBEDRAG: Math.round(f.BEDRAG_EXCL * 1.21 * 100) / 100,
          BETAALD_BEDRAG: f.BETAALD_BEDRAG,
          OPENSTAAND: openstaand,
          STATUS: f.STATUS,
          DAGEN_OVERDUE: openstaand > 0 ? daysOverdue(f.DATUM) : 0,
        };
      })
    )
    .sort((a, b) => b.DATUM.localeCompare(a.DATUM));
}

export function getDbFacturenAging(database: string) {
  const buckets: Record<string, { BUCKET: string; AANTAL: number; BEDRAG: number }> = {
    current: { BUCKET: "current", AANTAL: 0, BEDRAG: 0 },
    "1-30":  { BUCKET: "1-30",   AANTAL: 0, BEDRAG: 0 },
    "31-60": { BUCKET: "31-60",  AANTAL: 0, BEDRAG: 0 },
    "61-90": { BUCKET: "61-90",  AANTAL: 0, BEDRAG: 0 },
    "90+":   { BUCKET: "90+",    AANTAL: 0, BEDRAG: 0 },
  };
  for (const f of getDbFacturen(database).filter((f) => f.OPENSTAAND > 0)) {
    const d = f.DAGEN_OVERDUE;
    const key = d <= 0 ? "current" : d <= 30 ? "1-30" : d <= 60 ? "31-60" : d <= 90 ? "61-90" : "90+";
    buckets[key].AANTAL++;
    buckets[key].BEDRAG = Math.round((buckets[key].BEDRAG + f.OPENSTAAND) * 100) / 100;
  }
  return Object.values(buckets).filter((b) => b.AANTAL > 0);
}

export function getDbOmzetPerMaand(database: string) {
  const map = new Map<string, number>();
  for (const f of getDbFacturen(database)) {
    const [jaar, maand] = f.DATUM.split("-");
    const key = `${jaar}-${maand}`;
    map.set(key, (map.get(key) ?? 0) + f.BEDRAG_EXCL);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-18)
    .map(([key, omzet]) => {
      const [jaar, maand] = key.split("-");
      return { JAAR: Number(jaar), MAAND: Number(maand), OMZET: Math.round(omzet * 100) / 100 };
    });
}

export function getDbTopKlanten(database: string) {
  const year = String(new Date().getFullYear());
  const map = new Map<string, number>();
  for (const f of getDbFacturen(database).filter((f) => f.DATUM.startsWith(year))) {
    map.set(f.KLANT, (map.get(f.KLANT) ?? 0) + f.BEDRAG_EXCL);
  }
  for (const p of (ALL_PROJECTS[database as Database] ?? [])) {
    if (!map.has(p.KLANT)) {
      map.set(p.KLANT, p.AANNEEMSOM + p.MEERWERK);
    }
  }
  return Array.from(map.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([klant, omzet]) => ({ KLANT: klant, OMZET: Math.round(omzet * 100) / 100 }));
}

export function getDbUrenPerMedewerker(database: string) {
  const map = new Map<string, number>();
  for (const p of (ALL_PROJECTS[database as Database] ?? [])) {
    map.set(p.PROJECTLEIDER, (map.get(p.PROJECTLEIDER) ?? 0) + p.UREN_AANTAL);
  }
  return Array.from(map.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([naam, uren]) => ({ NAAM: naam, UREN: Math.round(uren) }));
}

export function getDbUrenPerProject(database: string) {
  return (ALL_PROJECTS[database as Database] ?? [])
    .map((p) => ({
      PROJECT: p.PROJECTNUMMER,
      NAAM: p.NAAM.length > 32 ? p.NAAM.slice(0, 30) + "…" : p.NAAM,
      UREN: p.UREN_AANTAL,
    }))
    .sort((a, b) => b.UREN - a.UREN)
    .slice(0, 8);
}

export function getDbUrenStats(database: string) {
  const projects = ALL_PROJECTS[database as Database] ?? [];
  const total = projects.reduce((s, p) => s + p.UREN_AANTAL, 0);
  const medewerkers = new Set(projects.map((p) => p.PROJECTLEIDER)).size;
  return {
    UREN_DEZE_WEEK:      Math.round(total / 52 * 10) / 10,
    UREN_DEZE_MAAND:     Math.round(total / 12 * 10) / 10,
    ACTIEVE_MEDEWERKERS: medewerkers,
  };
}

export function getDbUrenPerDag(database: string) {
  const projects = ALL_PROJECTS[database as Database] ?? [];
  const total = projects.reduce((s, p) => s + p.UREN_AANTAL, 0);
  const dailyBase = total / 250;

  const result: { DATUM: string; UREN: number }[] = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    const dateStr = d.toISOString().slice(0, 10);
    const v = deterministicVariance(database + dateStr);
    result.push({ DATUM: dateStr, UREN: Math.round(dailyBase * v * 10) / 10 });
  }
  return result;
}

const WERKBON_TYPES = ["STORING", "PREVENTIEF", "INSPECTIE", "REPARATIE", "INSTALLATIE"];
const WERKBON_STATUSES = ["NIEUW", "IN_UITVOERING", "AFGEROND", "GEFACTUREERD"] as const;

export function getDbRecenteWerkbonnen(database: string) {
  const projects = ALL_PROJECTS[database as Database] ?? [];
  const today = new Date();
  return projects.slice(0, 6).map((p, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i * 2);
    return {
      BONNUMMER: `WB-${database.slice(0, 3)}-${String(i + 1).padStart(4, "0")}`,
      OMSCHRIJVING: `${WERKBON_TYPES[i % WERKBON_TYPES.length]} – ${p.NAAM.slice(0, 35)}`,
      DATUM: d.toISOString().slice(0, 10),
      STATUS: WERKBON_STATUSES[i % WERKBON_STATUSES.length],
      KLANT: p.KLANT,
    };
  });
}

const TAKEN = ["Montage", "Inspectie", "Meting", "Programmering", "Testen", "Inbedrijfstelling"];

export function getDbRecenteUren(database: string) {
  const projects = ALL_PROJECTS[database as Database] ?? [];
  const today = new Date();
  const result: {
    DATUM: string; MEDEWERKER: string; GC_CODE: string;
    WERK_CODE: string; WERK_NAAM: string; TAAK: string; AANTAL: number; OMSCHRIJVING: string;
  }[] = [];
  let i = 0;
  for (const p of projects) {
    for (let d = 0; d < 3 && result.length < 15; d++, i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - Math.floor(i / 3));
      const initials = p.PROJECTLEIDER.split(" ").map((w: string) => w[0]).join("").toUpperCase();
      const uren = Math.round((4 + deterministicVariance(database + p.PROJECTNUMMER + String(d)) * 3) * 2) / 2;
      result.push({
        DATUM: date.toISOString().slice(0, 10),
        MEDEWERKER: p.PROJECTLEIDER,
        GC_CODE: initials,
        WERK_CODE: p.PROJECTNUMMER,
        WERK_NAAM: p.NAAM,
        TAAK: TAKEN[i % TAKEN.length],
        AANTAL: Math.max(1, Math.min(8, uren)),
        OMSCHRIJVING: `${TAKEN[i % TAKEN.length]} werkzaamheden`,
      });
    }
  }
  return result.sort((a, b) => b.DATUM.localeCompare(a.DATUM));
}

export function getDbInkoopPerKostensoort(database: string) {
  const projects = ALL_PROJECTS[database as Database] ?? [];
  const totalKosten = projects.reduce((s, p) => s + p.DIRECTE_KOSTEN, 0);
  return [
    { KOSTENSOORT: "Materialen & hulpstoffen", pct: 0.44 },
    { KOSTENSOORT: "Onderaanneming",           pct: 0.26 },
    { KOSTENSOORT: "Huur materieel",           pct: 0.12 },
    { KOSTENSOORT: "Transportkosten",          pct: 0.08 },
    { KOSTENSOORT: "Overige kosten",           pct: 0.10 },
  ].map(({ KOSTENSOORT, pct }) => ({
    KOSTENSOORT,
    BEDRAG: Math.round(totalKosten * pct * 100) / 100,
  }));
}

export function getDbDashboardKpis(database: string) {
  const projecten = getElmarProjecten(database);
  const facturen  = getDbFacturen(database);
  const year  = String(new Date().getFullYear());
  const month = `${year}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  return {
    omzetDezeMonth:  { OMZET: facturen.filter((f) => f.DATUM.startsWith(month)).reduce((s, f) => s + f.BEDRAG_EXCL, 0) },
    omzetDitJaar:    { OMZET: facturen.filter((f) => f.DATUM.startsWith(year)).reduce((s, f) => s + f.BEDRAG_EXCL, 0) },
    openProjecten:   { CNT: projecten.filter((p) => p.STATUS === "ACTIEF").length },
    openWerkbonnen:  { CNT: Math.round(projecten.filter((p) => p.STATUS === "ACTIEF").length * 1.8) },
    openDebiteuren:  { BEDRAG: facturen.filter((f) => f.OPENSTAAND > 0).reduce((s, f) => s + f.OPENSTAAND, 0) },
  };
}

/**
 * Get all projects for a database with computed summary fields.
 */
export function getElmarProjecten(database: string): ElmarProjectSummary[] {
  const db = database as Database;
  const projects = ALL_PROJECTS[db] ?? [];
  return projects.map((project) => {
    const r = computeRapport(project);
    return {
      ID:                 r.ID,
      DATABASE:           r.DATABASE,
      PROJECTNUMMER:      r.PROJECTNUMMER,
      NAAM:               r.NAAM,
      KLANT:              r.KLANT,
      PROJECTLEIDER:      r.PROJECTLEIDER,
      STATUS:             r.STATUS,
      STARTDATUM:         r.STARTDATUM,
      EINDDATUM:          r.EINDDATUM,
      AANNEEMSOM:         r.AANNEEMSOM,
      MEERWERK:           r.MEERWERK,
      TOTAAL_AANNEEMSOM:  r.TOTAAL_AANNEEMSOM,
      GEFACTUREERD_TOTAAL: r.GEFACTUREERD_TOTAAL,
      BETAALD_TOTAAL:     r.BETAALD_TOTAAL,
      PCT_BETAALD:        r.PCT_BETAALD,
      BRUTOMARGE:         r.BRUTOMARGE,
      MARGE_PCT:          r.MARGE_PCT,
      TOTALE_KOSTEN:      r.TOTALE_KOSTEN,
    };
  });
}

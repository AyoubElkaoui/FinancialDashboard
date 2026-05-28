import {
  startOfWeek, addWeeks, addMonths, startOfMonth,
  getWeek, getMonth, getYear, differenceInDays, format,
} from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

export type WerkbonCategorie = "ONDERHOUD" | "EW" | "CV" | "SLUITING_300" | "KLUSSEN_300";
export type WerkbonStatus    = "AANGEMAAKT" | "UITGEVOERD" | "OPENSTAAND";

export interface MaintenanceKlant {
  id:       string;
  naam:     string;
  variant:  string;
  telefoon: string;
  email:    string;
  adres:    string;
  plaats:   string;
}

export interface MaintenanceWerkbon {
  id:         string;
  klantId:    string;
  klantNaam:  string;
  categorie:  WerkbonCategorie;
  status:     WerkbonStatus;
  datum:      string;   // ISO yyyy-MM-dd
  week:       number;
  maand:      number;
  jaar:       number;
  omzet:      number;
  omschrijving: string;
  technicus:  string;
}

export interface WeekStats {
  week:       number;
  jaar:       number;
  label:      string;
  omzet:      number;
  uitgevoerd: number;
  aangemaakt: number;
  openstaand: number;
  totaal:     number;
}

export interface MaandStats {
  maand:      number;
  jaar:       number;
  label:      string;
  omzet:      number;
  uitgevoerd: number;
  aangemaakt: number;
  openstaand: number;
  totaal:     number;
}

export interface JaarStats {
  jaar:        number;
  omzet:       number;
  totaal:      number;
  pctVsVorig:  number | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const MAINTENANCE_KLANTEN: MaintenanceKlant[] = [
  { id: "k1", naam: "AS Watson",       variant: "only normal", telefoon: "020-1234567", email: "beheer@aswatson.nl",     adres: "Amstelstraat 42",               plaats: "Amsterdam" },
  { id: "k2", naam: "Shell Nederland", variant: "premium",     telefoon: "070-2345678", email: "facility@shell.nl",      adres: "Carel van Bylandtlaan 30",      plaats: "Den Haag"   },
  { id: "k3", naam: "ABN AMRO",        variant: "normal",      telefoon: "020-3456789", email: "onderhoud@abnamro.nl",   adres: "Gustav Mahlerlaan 10",          plaats: "Amsterdam" },
  { id: "k4", naam: "PostNL",          variant: "normal",      telefoon: "070-4567890", email: "facilitair@postnl.nl",   adres: "Prinses Beatrixlaan 23",        plaats: "Den Haag"   },
  { id: "k5", naam: "Heineken",        variant: "premium",     telefoon: "020-5678901", email: "onderhoud@heineken.nl",  adres: "Tweede Weteringplantsoen 21",   plaats: "Amsterdam" },
];

const CATEGORIE_CFG: { cat: WerkbonCategorie; weight: number; min: number; max: number }[] = [
  { cat: "ONDERHOUD",    weight: 40, min: 100, max: 200 },
  { cat: "EW",           weight: 20, min: 200, max: 400 },
  { cat: "CV",           weight: 20, min: 150, max: 300 },
  { cat: "SLUITING_300", weight: 10, min: 80,  max: 150 },
  { cat: "KLUSSEN_300",  weight: 10, min: 90,  max: 160 },
];

const TECHNICI = ["Jan de Boer", "Piet Bakker", "Klaas Janssen", "Erik Visser", "Mark van Dijk"];

const KLANT_WEEKLY_AVG: Record<string, number> = {
  k1: 12, k2: 8, k3: 6, k4: 5, k5: 4,
};

const OMSCHRIJVINGEN: Record<WerkbonCategorie, string[]> = {
  ONDERHOUD:    ["Periodiek onderhoud installaties", "Preventief onderhoud", "Jaarlijks onderhoud", "Onderhoud leidingwerk", "Kwartaalcheck installaties"],
  EW:           ["Elektra installatie controleren", "Werktuigbouwkundige inspectie", "E/W storing verhelpen", "Elektrische keuring", "Schakelkast controleren"],
  CV:           ["CV-ketel onderhoud", "CV-systeem ontluchten", "Radiatoren controleren", "CV-pomp vervangen", "Expansievat checken"],
  SLUITING_300: ["Sluitingswerk 300-serie", "Afsluiter 300 vervangen", "300-sluiting klaar melden", "300-sluiting controleren", "Dichting 300 herstellen"],
  KLUSSEN_300:  ["Klus 300-serie", "Diverse werkzaamheden 300", "300-klus afhandelen", "Herstelwerk 300-serie", "Maatwerk klus 300"],
};

const TODAY = new Date(2026, 4, 28);

// ── Deterministic helpers ─────────────────────────────────────────────────────

function h(s: string): number {
  return s.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffffff, 0);
}

function det(seed: string, min: number, max: number): number {
  return min + (h(seed) % (max - min + 1));
}

function pick<T>(seed: string, items: T[]): T {
  return items[h(seed) % items.length];
}

function pickWeighted<T>(seed: string, entries: { value: T; weight: number }[]): T {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  const point = h(seed) % total;
  let cum = 0;
  for (const e of entries) {
    cum += e.weight;
    if (point < cum) return e.value;
  }
  return entries[entries.length - 1].value;
}

// ── Data generation ───────────────────────────────────────────────────────────

let _cache: MaintenanceWerkbon[] | null = null;

function generate(): MaintenanceWerkbon[] {
  const bons: MaintenanceWerkbon[] = [];
  let counter = 1;

  const startDate = new Date(2024, 0, 1);
  let weekStart = startOfWeek(startDate, { weekStartsOn: 1 });

  while (weekStart <= TODAY) {
    const weekNum  = getWeek(weekStart, { weekStartsOn: 1 });
    const yearNum  = getYear(weekStart);

    for (const klant of MAINTENANCE_KLANTEN) {
      const avg = KLANT_WEEKLY_AVG[klant.id];
      const count = det(`cnt-${klant.id}-${yearNum}-${weekNum}`, Math.max(1, avg - 3), avg + 3);

      for (let i = 0; i < count; i++) {
        const seed = `bon-${klant.id}-${yearNum}-${weekNum}-${i}`;

        const dayOffset = det(`${seed}-day`, 0, 4);
        const bonDate = new Date(weekStart);
        bonDate.setDate(bonDate.getDate() + dayOffset);
        if (bonDate > TODAY) continue;

        const daysDiff = differenceInDays(TODAY, bonDate);
        const status: WerkbonStatus = pickWeighted(`${seed}-st`, daysDiff > 30
          ? [{ value: "UITGEVOERD" as const, weight: 90 }, { value: "OPENSTAAND" as const, weight: 10 }]
          : daysDiff > 7
          ? [{ value: "UITGEVOERD" as const, weight: 60 }, { value: "OPENSTAAND" as const, weight: 25 }, { value: "AANGEMAAKT" as const, weight: 15 }]
          : [{ value: "UITGEVOERD" as const, weight: 30 }, { value: "OPENSTAAND" as const, weight: 30 }, { value: "AANGEMAAKT" as const, weight: 40 }]
        );

        const catCfg = pickWeighted(`${seed}-cat`, CATEGORIE_CFG.map(c => ({ value: c, weight: c.weight })));
        const rawOmzet = det(`${seed}-omzet`, catCfg.min, catCfg.max);

        bons.push({
          id:          `WB-${String(counter++).padStart(5, "0")}`,
          klantId:     klant.id,
          klantNaam:   klant.naam,
          categorie:   catCfg.cat,
          status,
          datum:       format(bonDate, "yyyy-MM-dd"),
          week:        weekNum,
          maand:       getMonth(bonDate) + 1,
          jaar:        getYear(bonDate),
          omzet:       status === "UITGEVOERD" ? rawOmzet : 0,
          omschrijving: pick(`${seed}-omschr`, OMSCHRIJVINGEN[catCfg.cat]),
          technicus:   pick(`${seed}-tech`, TECHNICI),
        });
      }
    }
    weekStart = addWeeks(weekStart, 1);
  }

  return bons.sort((a, b) => b.datum.localeCompare(a.datum));
}

export function getMaintenanceWerkbonnen(): MaintenanceWerkbon[] {
  if (!_cache) _cache = generate();
  return _cache;
}

// ── Aggregation ───────────────────────────────────────────────────────────────

const MAAND_LABELS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export function getWeekStats(klantId?: string, n = 12): WeekStats[] {
  const bons = getMaintenanceWerkbonnen().filter(b => !klantId || b.klantId === klantId);
  const result: WeekStats[] = [];

  for (let i = n - 1; i >= 0; i--) {
    const d   = addWeeks(startOfWeek(TODAY, { weekStartsOn: 1 }), -i);
    const wk  = getWeek(d, { weekStartsOn: 1 });
    const yr  = getYear(d);
    const sub = bons.filter(b => b.week === wk && b.jaar === yr);

    result.push({
      week:       wk,
      jaar:       yr,
      label:      `W${wk} '${String(yr).slice(2)}`,
      omzet:      sub.reduce((s, b) => s + b.omzet, 0),
      uitgevoerd: sub.filter(b => b.status === "UITGEVOERD").length,
      aangemaakt: sub.filter(b => b.status === "AANGEMAAKT").length,
      openstaand: sub.filter(b => b.status === "OPENSTAAND").length,
      totaal:     sub.length,
    });
  }
  return result;
}

export function getMaandStats(klantId?: string, n = 12): MaandStats[] {
  const bons = getMaintenanceWerkbonnen().filter(b => !klantId || b.klantId === klantId);
  const result: MaandStats[] = [];

  for (let i = n - 1; i >= 0; i--) {
    const d   = addMonths(startOfMonth(TODAY), -i);
    const mo  = getMonth(d) + 1;
    const yr  = getYear(d);
    const sub = bons.filter(b => b.maand === mo && b.jaar === yr);

    result.push({
      maand:      mo,
      jaar:       yr,
      label:      `${MAAND_LABELS[mo - 1]} '${String(yr).slice(2)}`,
      omzet:      sub.reduce((s, b) => s + b.omzet, 0),
      uitgevoerd: sub.filter(b => b.status === "UITGEVOERD").length,
      aangemaakt: sub.filter(b => b.status === "AANGEMAAKT").length,
      openstaand: sub.filter(b => b.status === "OPENSTAAND").length,
      totaal:     sub.length,
    });
  }
  return result;
}

export function getJaarStats(): JaarStats[] {
  const bons = getMaintenanceWerkbonnen();
  const jaren = [2024, 2025, 2026];

  const raw = jaren.map(jaar => {
    const sub = bons.filter(b => b.jaar === jaar);
    return { jaar, omzet: sub.reduce((s, b) => s + b.omzet, 0), totaal: sub.length };
  });

  return raw.map((s, i) => ({
    ...s,
    pctVsVorig: i === 0 || raw[i - 1].omzet === 0 ? null
      : Math.round((s.omzet / raw[i - 1].omzet - 1) * 10000) / 100,
  }));
}

export function getKlantSummary(klantId: string) {
  const bons  = getMaintenanceWerkbonnen().filter(b => b.klantId === klantId);
  const thisW = getWeek(TODAY, { weekStartsOn: 1 });
  const thisM = getMonth(TODAY) + 1;
  const thisY = getYear(TODAY);

  const slice = (sub: MaintenanceWerkbon[]) => ({
    omzet:      sub.reduce((s, b) => s + b.omzet, 0),
    totaal:     sub.length,
    uitgevoerd: sub.filter(b => b.status === "UITGEVOERD").length,
    openstaand: sub.filter(b => b.status === "OPENSTAAND").length,
  });

  return {
    week:  slice(bons.filter(b => b.week === thisW && b.jaar === thisY)),
    maand: slice(bons.filter(b => b.maand === thisM && b.jaar === thisY)),
    jaar:  slice(bons.filter(b => b.jaar === thisY)),
  };
}

export function getAllKlantenSummary() {
  return MAINTENANCE_KLANTEN.map(k => ({
    klant:   k,
    summary: getKlantSummary(k.id),
  }));
}

export function getCategorieStats(klantId?: string) {
  const bons = getMaintenanceWerkbonnen().filter(b =>
    (!klantId || b.klantId === klantId) && b.jaar === getYear(TODAY)
  );
  const cats: WerkbonCategorie[] = ["ONDERHOUD", "EW", "CV", "SLUITING_300", "KLUSSEN_300"];
  return cats.map(cat => {
    const sub = bons.filter(b => b.categorie === cat);
    return {
      categorie: cat,
      label: CATEGORIE_LABELS[cat],
      totaal: sub.length,
      omzet: sub.reduce((s, b) => s + b.omzet, 0),
      uitgevoerd: sub.filter(b => b.status === "UITGEVOERD").length,
      openstaand: sub.filter(b => b.status === "OPENSTAAND").length,
    };
  });
}

export const CATEGORIE_LABELS: Record<WerkbonCategorie, string> = {
  ONDERHOUD:    "Onderhoud",
  EW:           "E/W",
  CV:           "CV",
  SLUITING_300: "300 Sluiting",
  KLUSSEN_300:  "300 Klussen",
};

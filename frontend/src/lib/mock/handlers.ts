import {
  KLANTEN, PROJECTEN, WERKBONNEN, FACTUREN, INKOOPFACTUREN, MEDEWERKERS, UREN,
  KOSTENSOORTEN, GROOTBOEK_RUBRIEKEN, GROOTBOEK_MUTATIES,
  type MockFactuur, type MockProject, type MockWerkbon, type MockInkoopFactuur, type MockGrootboekMutatie,
} from "./seed";

function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { data: items.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, totalPages };
}
function matchSearch(value: unknown, search: string) {
  return String(value ?? "").toLowerCase().includes(search.toLowerCase());
}
function inDateRange(date: string, from?: string, to?: string) {
  if (from && date < from) return false;
  if (to   && date > to)   return false;
  return true;
}
function sortBy<T>(items: T[], key: keyof T, dir: "ASC" | "DESC"): T[] {
  return [...items].sort((a, b) => {
    const av = a[key], bv = b[key];
    if (av == null) return 1; if (bv == null) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return dir === "DESC" ? -cmp : cmp;
  });
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function mockDashboardKpis() {
  const now = new Date();
  const ym   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const year = String(now.getFullYear());
  return {
    omzetDezeMonth:  { OMZET: FACTUREN.filter(f => f.DATUM.startsWith(ym)).reduce((s, f) => s + f.BEDRAG_EXCL, 0) },
    omzetDitJaar:    { OMZET: FACTUREN.filter(f => f.DATUM.startsWith(year)).reduce((s, f) => s + f.BEDRAG_EXCL, 0) },
    openProjecten:   { CNT: PROJECTEN.filter(p => p.STATUS === "ACTIEF").length },
    openWerkbonnen:  { CNT: WERKBONNEN.filter(w => !["AFGEROND","GEFACTUREERD"].includes(w.STATUS)).length },
    openDebiteuren:  { BEDRAG: FACTUREN.filter(f => f.OPENSTAAND > 0).reduce((s, f) => s + f.OPENSTAAND, 0) },
  };
}

export function mockOmzetPerMaand() {
  const map = new Map<string, number>();
  for (const f of FACTUREN) {
    const [jaar, maand] = f.DATUM.split("-");
    const key = `${jaar}-${maand}`;
    map.set(key, (map.get(key) ?? 0) + f.BEDRAG_EXCL);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, omzet]) => {
    const [jaar, maand] = key.split("-");
    return { JAAR: Number(jaar), MAAND: Number(maand), OMZET: Math.round(omzet * 100) / 100 };
  });
}

export function mockTopKlanten() {
  const year = String(new Date().getFullYear());
  const map = new Map<string, number>();
  for (const f of FACTUREN.filter(f => f.DATUM.startsWith(year)))
    map.set(f.KLANT, (map.get(f.KLANT) ?? 0) + f.BEDRAG_EXCL);
  return Array.from(map.entries()).sort(([,a],[,b]) => b - a).slice(0, 10)
    .map(([klant, omzet]) => ({ KLANT: klant, OMZET: Math.round(omzet * 100) / 100 }));
}

export function mockRecenteWerkbonnen() {
  return [...WERKBONNEN].sort((a, b) => b.DATUM.localeCompare(a.DATUM)).slice(0, 10)
    .map(w => ({ BONNUMMER: w.BONNUMMER, OMSCHRIJVING: w.OMSCHRIJVING, DATUM: w.DATUM, STATUS: w.STATUS, KLANT: w.KLANT }));
}

export function mockDashboardUrenStats() {
  const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2,"0")}`;
  const now = new Date(); const dow = now.getDay() || 7;
  const mon = new Date(now); mon.setDate(now.getDate() - dow + 1); mon.setHours(0,0,0,0);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999);
  return {
    UREN_DEZE_WEEK:       UREN.filter(u => { const d = new Date(u.DATUM); return d >= mon && d <= sun; }).reduce((s,u) => s + u.AANTAL, 0),
    UREN_DEZE_MAAND:      UREN.filter(u => u.DATUM.startsWith(month)).reduce((s,u) => s + u.AANTAL, 0),
    ACTIEVE_MEDEWERKERS:  new Set(UREN.filter(u => u.DATUM.startsWith(month)).map(u => u.GC_CODE)).size,
  };
}

export function mockUrenPerDag() {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 14);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const map = new Map<string, number>();
  for (const u of UREN.filter(u => u.DATUM >= cutoffStr))
    map.set(u.DATUM, (map.get(u.DATUM) ?? 0) + u.AANTAL);
  return Array.from(map.entries()).sort(([a],[b]) => a.localeCompare(b))
    .map(([datum, uren]) => ({ DATUM: datum, UREN: Math.round(uren * 10) / 10 }));
}

export function mockUrenPerMedewerker() {
  const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2,"0")}`;
  const map = new Map<string, { NAAM: string; UREN: number }>();
  for (const u of UREN.filter(u => u.DATUM.startsWith(month))) {
    const e = map.get(u.GC_CODE) ?? { NAAM: u.MEDEWERKER, UREN: 0 };
    e.UREN = Math.round((e.UREN + u.AANTAL) * 10) / 10;
    map.set(u.GC_CODE, e);
  }
  return Array.from(map.values()).sort((a,b) => b.UREN - a.UREN);
}

export function mockUrenPerProject() {
  const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2,"0")}`;
  const map = new Map<string, { NAAM: string; UREN: number }>();
  for (const u of UREN.filter(u => u.DATUM.startsWith(month))) {
    const e = map.get(u.WERK_CODE) ?? { NAAM: u.WERK_NAAM.length > 30 ? u.WERK_NAAM.slice(0,28)+"…" : u.WERK_NAAM, UREN: 0 };
    e.UREN = Math.round((e.UREN + u.AANTAL) * 10) / 10;
    map.set(u.WERK_CODE, e);
  }
  return Array.from(map.entries()).sort(([,a],[,b]) => b.UREN - a.UREN).slice(0,8)
    .map(([code, e]) => ({ PROJECT: code, NAAM: e.NAAM, UREN: e.UREN }));
}

export function mockRecenteUren() {
  return [...UREN].sort((a,b) => b.DATUM.localeCompare(a.DATUM) || b.ID - a.ID).slice(0,15)
    .map(u => ({ DATUM: u.DATUM, MEDEWERKER: u.MEDEWERKER, GC_CODE: u.GC_CODE, WERK_CODE: u.WERK_CODE, WERK_NAAM: u.WERK_NAAM, TAAK: u.TAAK, AANTAL: u.AANTAL, OMSCHRIJVING: u.OMSCHRIJVING }));
}

export function mockMedewerkers() {
  return MEDEWERKERS.filter(m => m.ACTIEF).map(m => ({ ID: m.ID, GC_CODE: m.GC_CODE, NAAM: m.NAAM, FUNCTIE: m.FUNCTIE, UURLOON: m.UURLOON }));
}

// ─── Projecten ────────────────────────────────────────────────────────────────

interface ProjectListParams { page?: number; pageSize?: number; search?: string; status?: string; klantId?: number; dateFrom?: string; dateTo?: string; sortBy?: string; sortDir?: "ASC"|"DESC"; }

export function mockProjectenList(p: ProjectListParams) {
  let items: MockProject[] = [...PROJECTEN];
  if (p.search)              items = items.filter(r => matchSearch(r.NAAM, p.search!) || matchSearch(r.PROJECTNUMMER, p.search!));
  if (p.status)              items = items.filter(r => r.STATUS === p.status);
  if (p.klantId)             items = items.filter(r => r.KLANT_ID === p.klantId);
  if (p.dateFrom || p.dateTo) items = items.filter(r => inDateRange(r.STARTDATUM, p.dateFrom, p.dateTo));
  items = sortBy(items, (p.sortBy ?? "PROJECTNUMMER") as keyof MockProject, p.sortDir ?? "DESC");
  return paginate(items, p.page ?? 1, p.pageSize ?? 50);
}

export function mockProjectDetail(id: number) {
  const project = PROJECTEN.find(p => p.ID === id);
  if (!project) return null;
  return {
    ...project,
    werkbonnen: WERKBONNEN.filter(w => w.PROJECT_ID === id).map(w => ({ BONNUMMER: w.BONNUMMER, DATUM: w.DATUM, STATUS: w.STATUS, OMSCHRIJVING: w.OMSCHRIJVING })),
    facturen:   FACTUREN.filter(f => f.PROJECT_ID === id).map(f => ({ FACTUURNUMMER: f.FACTUURNUMMER, DATUM: f.DATUM, BEDRAG_EXCL: f.BEDRAG_EXCL, BTW: f.BTW, TOTAALBEDRAG: f.TOTAALBEDRAG, STATUS: f.STATUS })),
  };
}

// ─── Facturen ─────────────────────────────────────────────────────────────────

interface FactuurListParams { page?: number; pageSize?: number; search?: string; status?: string; klantId?: number; projectId?: number; dateFrom?: string; dateTo?: string; sortBy?: string; sortDir?: "ASC"|"DESC"; }

export function mockFacturenList(p: FactuurListParams) {
  let items: MockFactuur[] = [...FACTUREN];
  if (p.search)              items = items.filter(r => matchSearch(r.FACTUURNUMMER, p.search!));
  if (p.status === "open")   items = items.filter(r => r.OPENSTAAND > 0);
  if (p.status === "betaald") items = items.filter(r => r.OPENSTAAND <= 0);
  if (p.klantId)             items = items.filter(r => r.KLANT_ID === p.klantId);
  if (p.projectId)           items = items.filter(r => r.PROJECT_ID === p.projectId);
  if (p.dateFrom || p.dateTo) items = items.filter(r => inDateRange(r.DATUM, p.dateFrom, p.dateTo));
  items = sortBy(items, (p.sortBy ?? "DATUM") as keyof MockFactuur, p.sortDir ?? "DESC");
  return paginate(items, p.page ?? 1, p.pageSize ?? 50);
}

export function mockFacturenAging() {
  const buckets: Record<string, { BUCKET: string; AANTAL: number; BEDRAG: number }> = {
    current: { BUCKET:"current",AANTAL:0,BEDRAG:0 }, "1-30": { BUCKET:"1-30",AANTAL:0,BEDRAG:0 },
    "31-60": { BUCKET:"31-60",AANTAL:0,BEDRAG:0 },  "61-90":{ BUCKET:"61-90",AANTAL:0,BEDRAG:0 }, "90+": { BUCKET:"90+",AANTAL:0,BEDRAG:0 },
  };
  for (const f of FACTUREN.filter(f => f.OPENSTAAND > 0)) {
    const d = f.DAGEN_OVERDUE;
    const key = d <= 0 ? "current" : d <= 30 ? "1-30" : d <= 60 ? "31-60" : d <= 90 ? "61-90" : "90+";
    buckets[key].AANTAL++; buckets[key].BEDRAG = Math.round((buckets[key].BEDRAG + f.OPENSTAAND) * 100) / 100;
  }
  return Object.values(buckets).filter(b => b.AANTAL > 0);
}

export function mockFactuurDetail(id: number) {
  const f = FACTUREN.find(f => f.ID === id); if (!f) return null;
  const klant = KLANTEN.find(k => k.ID === f.KLANT_ID)!;
  return { ...f, ADRES: klant.ADRES, POSTCODE: klant.POSTCODE, PLAATS: klant.PLAATS, regels: [
    { REGELNUMMER: 1, OMSCHRIJVING: "Arbeid installatie", AANTAL: 8, PRIJS: f.BEDRAG_EXCL * 0.6, BEDRAG: f.BEDRAG_EXCL * 0.6 },
    { REGELNUMMER: 2, OMSCHRIJVING: "Materialen",          AANTAL: 1, PRIJS: f.BEDRAG_EXCL * 0.4, BEDRAG: f.BEDRAG_EXCL * 0.4 },
  ]};
}

// ─── Werkbonnen ───────────────────────────────────────────────────────────────

interface WerkbonListParams { page?: number; pageSize?: number; search?: string; status?: string; klantId?: number; projectId?: number; dateFrom?: string; dateTo?: string; sortBy?: string; sortDir?: "ASC"|"DESC"; }

export function mockWerkbonnenList(p: WerkbonListParams) {
  let items: MockWerkbon[] = [...WERKBONNEN];
  if (p.search)              items = items.filter(r => matchSearch(r.BONNUMMER, p.search!) || matchSearch(r.OMSCHRIJVING, p.search!));
  if (p.status)              items = items.filter(r => r.STATUS === p.status);
  if (p.klantId)             items = items.filter(r => r.KLANT_ID === p.klantId);
  if (p.projectId)           items = items.filter(r => r.PROJECT_ID === p.projectId);
  if (p.dateFrom || p.dateTo) items = items.filter(r => inDateRange(r.DATUM, p.dateFrom, p.dateTo));
  items = sortBy(items, (p.sortBy ?? "DATUM") as keyof MockWerkbon, p.sortDir ?? "DESC");
  return paginate(items, p.page ?? 1, p.pageSize ?? 50);
}

export function mockWerkbonDetail(id: number) {
  const w = WERKBONNEN.find(w => w.ID === id); if (!w) return null;
  const uurloon = 95; const uren = Math.round((w.KOSTEN * 0.65) / uurloon * 2) / 2;
  const materialen = Math.round(w.KOSTEN * 0.35 * 100) / 100;
  return { ...w, regels: [
    { REGELNUMMER: 1, SOORT: "ARBEID",   OMSCHRIJVING: "Arbeid " + w.TYPE.toLowerCase(), UREN: uren,  PRIJS: uurloon,    BEDRAG: Math.round(uren * uurloon * 100) / 100 },
    { REGELNUMMER: 2, SOORT: "MATERIAAL",OMSCHRIJVING: "Materialen en onderdelen",        AANTAL: 1, PRIJS: materialen, BEDRAG: materialen },
    { REGELNUMMER: 3, SOORT: "INDIRECT", OMSCHRIJVING: "Indirecte kosten (7,5%)",         AANTAL: 1, PRIJS: w.INDIRECT, BEDRAG: w.INDIRECT },
    { REGELNUMMER: 4, SOORT: "ALGEMEEN", OMSCHRIJVING: "Algemene kosten (5%)",            AANTAL: 1, PRIJS: w.ALGEMEEN, BEDRAG: w.ALGEMEEN },
  ]};
}

export function mockWerkbonnenExportData(p: WerkbonListParams) {
  let items: MockWerkbon[] = [...WERKBONNEN];
  if (p.search)              items = items.filter(r => matchSearch(r.BONNUMMER, p.search!) || matchSearch(r.OMSCHRIJVING, p.search!));
  if (p.status)              items = items.filter(r => r.STATUS === p.status);
  if (p.klantId)             items = items.filter(r => r.KLANT_ID === p.klantId);
  if (p.projectId)           items = items.filter(r => r.PROJECT_ID === p.projectId);
  if (p.dateFrom || p.dateTo) items = items.filter(r => inDateRange(r.DATUM, p.dateFrom, p.dateTo));
  items = sortBy(items, "DATUM" as keyof MockWerkbon, "DESC");
  return items.map(w => ({
    NUMMER: w.BONNUMMER, DATUM: w.DATUM, OMSCHRIJVING: w.OMSCHRIJVING, TYPE: w.TYPE,
    MOEDERRELATIE: w.KLANT, OBJECTLOCATIE: w.OBJECTLOCATIE, ADRES: w.ADRES, FASE: w.FASE,
    UITVOERINGSDATUM: w.UITVOERINGSDATUM ?? "", COORDINATOR: w.COORDINATOR,
    KOSTEN: w.KOSTEN, INDIRECT: w.INDIRECT, ALGEMEEN: w.ALGEMEEN, TOTALE_KOSTEN: w.TOTALE_KOSTEN,
    OPBRENGSTEN: w.OPBRENGSTEN, B_MARGE: w.B_MARGE, MARGE_PCT: w.MARGE_PCT,
    FACTUURNUMMER: w.FACTUURNUMMER ?? "", FACTUURDATUM: w.FACTUURDATUM ?? "",
    BETAALD: w.BETAALD ? "Ja" : (w.STATUS === "GEFACTUREERD" ? "Nee" : ""),
  }));
}

// ─── Klanten ──────────────────────────────────────────────────────────────────

interface KlantListParams { page?: number; pageSize?: number; search?: string; sortBy?: string; sortDir?: "ASC"|"DESC"; }

export function mockKlantenList(p: KlantListParams) {
  const year = String(new Date().getFullYear());
  const omzetMap = new Map<number,number>(); const openMap = new Map<number,number>();
  for (const f of FACTUREN.filter(f => f.DATUM.startsWith(year))) omzetMap.set(f.KLANT_ID, (omzetMap.get(f.KLANT_ID) ?? 0) + f.BEDRAG_EXCL);
  for (const f of FACTUREN.filter(f => f.OPENSTAAND > 0))         openMap.set(f.KLANT_ID,  (openMap.get(f.KLANT_ID) ?? 0)  + f.OPENSTAAND);
  let items = KLANTEN.map(k => ({ ...k, OMZET: Math.round((omzetMap.get(k.ID) ?? 0)*100)/100, OPENSTAAND: Math.round((openMap.get(k.ID) ?? 0)*100)/100 }));
  if (p.search) items = items.filter(r => matchSearch(r.NAAM, p.search!));
  const dir = p.sortDir ?? "ASC"; const col = p.sortBy ?? "NAAM";
  items = items.sort((a,b) => { const av = col==="OMZET"?a.OMZET:col==="OPENSTAAND"?a.OPENSTAAND:a.NAAM; const bv = col==="OMZET"?b.OMZET:col==="OPENSTAAND"?b.OPENSTAAND:b.NAAM; const cmp = av<bv?-1:av>bv?1:0; return dir==="DESC"?-cmp:cmp; });
  return paginate(items, p.page ?? 1, p.pageSize ?? 50);
}

export function mockKlantDetail(id: number) {
  const k = KLANTEN.find(k => k.ID === id); if (!k) return null;
  return {
    ...k,
    projecten: PROJECTEN.filter(p => p.KLANT_ID === id).map(p => ({ PROJECTNUMMER: p.PROJECTNUMMER, NAAM: p.NAAM, STATUS: p.STATUS, STARTDATUM: p.STARTDATUM, EINDDATUM: p.EINDDATUM })),
    facturen:  FACTUREN.filter(f => f.KLANT_ID === id).sort((a,b) => b.DATUM.localeCompare(a.DATUM)).slice(0,20).map(f => ({ FACTUURNUMMER: f.FACTUURNUMMER, DATUM: f.DATUM, TOTAALBEDRAG: f.TOTAALBEDRAG, OPENSTAAND: f.OPENSTAAND, STATUS: f.STATUS })),
  };
}

// ─── Inkoop ───────────────────────────────────────────────────────────────────

interface InkoopListParams { page?: number; pageSize?: number; search?: string; projectId?: number; leverancierId?: number; dateFrom?: string; dateTo?: string; sortBy?: string; sortDir?: "ASC"|"DESC"; }

export function mockInkoopList(p: InkoopListParams) {
  let items: MockInkoopFactuur[] = [...INKOOPFACTUREN];
  if (p.search)              items = items.filter(r => matchSearch(r.FACTUURNUMMER, p.search!));
  if (p.projectId)           items = items.filter(r => r.PROJECT_ID === p.projectId);
  if (p.leverancierId)       items = items.filter(r => r.LEVERANCIER_ID === p.leverancierId);
  if (p.dateFrom || p.dateTo) items = items.filter(r => inDateRange(r.DATUM, p.dateFrom, p.dateTo));
  items = sortBy(items, (p.sortBy ?? "DATUM") as keyof MockInkoopFactuur, p.sortDir ?? "DESC");
  return paginate(items, p.page ?? 1, p.pageSize ?? 50);
}

export function mockInkoopPerKostensoort() {
  const year = String(new Date().getFullYear());
  const map = new Map<string,number>();
  for (const f of INKOOPFACTUREN.filter(f => f.DATUM.startsWith(year))) {
    const ks = KOSTENSOORTEN.find(k => k.ID === f.KOSTENSOORT_ID)?.OMSCHRIJVING ?? "Overig";
    map.set(ks, (map.get(ks) ?? 0) + f.BEDRAG_EXCL);
  }
  return Array.from(map.entries()).sort(([,a],[,b]) => b-a).map(([kostensoort,bedrag]) => ({ KOSTENSOORT: kostensoort, BEDRAG: Math.round(bedrag*100)/100 }));
}

// ─── Grootboek ────────────────────────────────────────────────────────────────

interface MutatieListParams { page?: number; pageSize?: number; rubriekId?: number; dateFrom?: string; dateTo?: string; sortDir?: "ASC"|"DESC"; }

export function mockGrootboekRubrieken() { return GROOTBOEK_RUBRIEKEN; }

export function mockGrootboekMutaties(p: MutatieListParams) {
  let items: MockGrootboekMutatie[] = [...GROOTBOEK_MUTATIES];
  if (p.rubriekId)           items = items.filter(r => r.RUBRIEK_ID === p.rubriekId);
  if (p.dateFrom || p.dateTo) items = items.filter(r => inDateRange(r.DATUM, p.dateFrom, p.dateTo));
  items = sortBy(items, "DATUM", p.sortDir ?? "DESC");
  return paginate(items, p.page ?? 1, p.pageSize ?? 50);
}

export function mockGrootboekResultaat() {
  const year = String(new Date().getFullYear());
  const mutaties = GROOTBOEK_MUTATIES.filter(m => m.DATUM.startsWith(year));
  return GROOTBOEK_RUBRIEKEN.map(r => {
    const rm = mutaties.filter(m => m.RUBRIEK_ID === r.ID);
    const debet = rm.reduce((s,m) => s + m.DEBET, 0); const credit = rm.reduce((s,m) => s + m.CREDIT, 0);
    return { SOORT: r.SOORT, REKENINGNUMMER: r.REKENINGNUMMER, OMSCHRIJVING: r.OMSCHRIJVING, DEBET_TOTAAL: Math.round(debet*100)/100, CREDIT_TOTAAL: Math.round(credit*100)/100, SALDO: Math.round((credit-debet)*100)/100 };
  });
}

// ─── Rapportages ─────────────────────────────────────────────────────────────

export function mockRapportOmzetProject(dateFrom?: string, dateTo?: string) {
  const map = new Map<string,{ NAAM: string; OMZET: number }>();
  for (const p of PROJECTEN) map.set(p.PROJECTNUMMER, { NAAM: p.NAAM, OMZET: 0 });
  for (const f of FACTUREN) {
    if (!f.PROJECT_ID || !inDateRange(f.DATUM, dateFrom, dateTo)) continue;
    const proj = PROJECTEN.find(p => p.ID === f.PROJECT_ID); if (!proj) continue;
    const e = map.get(proj.PROJECTNUMMER)!; e.OMZET = Math.round((e.OMZET + f.BEDRAG_EXCL)*100)/100;
  }
  return Array.from(map.entries()).map(([nr, e]) => ({ PROJECTNUMMER: nr, ...e })).filter(e => e.OMZET > 0).sort((a,b) => b.OMZET - a.OMZET);
}

export function mockRapportOpenDebiteuren() {
  return FACTUREN.filter(f => f.OPENSTAAND > 0).sort((a,b) => b.DAGEN_OVERDUE - a.DAGEN_OVERDUE)
    .map(f => ({ KLANT: f.KLANT, FACTUURNUMMER: f.FACTUURNUMMER, DATUM: f.DATUM, VERVALDATUM: f.VERVALDATUM, TOTAALBEDRAG: f.TOTAALBEDRAG, OPENSTAAND: f.OPENSTAAND, DAGEN_OVERDUE: f.DAGEN_OVERDUE }));
}

export function mockRapportMargeProjectleider(dateFrom?: string, dateTo?: string) {
  const map = new Map<string,{ PROJECTEN: number; OMZET: number; KOSTEN: number }>();
  for (const p of PROJECTEN) {
    if (!inDateRange(p.STARTDATUM, dateFrom, dateTo)) continue;
    const e = map.get(p.PROJECTLEIDER) ?? { PROJECTEN: 0, OMZET: 0, KOSTEN: 0 };
    e.PROJECTEN++;
    e.OMZET  += FACTUREN.filter(f => f.PROJECT_ID === p.ID).reduce((s,f) => s + f.BEDRAG_EXCL, 0);
    e.KOSTEN += INKOOPFACTUREN.filter(i => i.PROJECT_ID === p.ID).reduce((s,i) => s + i.BEDRAG_EXCL, 0);
    map.set(p.PROJECTLEIDER, e);
  }
  return Array.from(map.entries()).sort(([,a],[,b]) => (b.OMZET-b.KOSTEN)-(a.OMZET-a.KOSTEN))
    .map(([pl,e]) => ({ PROJECTLEIDER: pl, PROJECTEN: e.PROJECTEN, OMZET: Math.round(e.OMZET*100)/100, KOSTEN: Math.round(e.KOSTEN*100)/100, MARGE: Math.round((e.OMZET-e.KOSTEN)*100)/100 }));
}

export function mockRapportInkoopKostensoort(dateFrom?: string, dateTo?: string) {
  const map = new Map<string,{ FACTUREN: number; BEDRAG_EXCL: number; BTW: number; TOTAAL: number }>();
  for (const f of INKOOPFACTUREN) {
    if (!inDateRange(f.DATUM, dateFrom, dateTo)) continue;
    const ks = KOSTENSOORTEN.find(k => k.ID === f.KOSTENSOORT_ID)?.OMSCHRIJVING ?? "Overig";
    const e = map.get(ks) ?? { FACTUREN: 0, BEDRAG_EXCL: 0, BTW: 0, TOTAAL: 0 };
    e.FACTUREN++; e.BEDRAG_EXCL += f.BEDRAG_EXCL; e.BTW += f.BTW; e.TOTAAL += f.TOTAALBEDRAG;
    map.set(ks, e);
  }
  return Array.from(map.entries()).sort(([,a],[,b]) => b.BEDRAG_EXCL - a.BEDRAG_EXCL)
    .map(([ks,e]) => ({ KOSTENSOORT: ks, FACTUREN: e.FACTUREN, BEDRAG_EXCL: Math.round(e.BEDRAG_EXCL*100)/100, BTW: Math.round(e.BTW*100)/100, TOTAAL: Math.round(e.TOTAAL*100)/100 }));
}

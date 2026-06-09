"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, Loader2, AlertCircle, ChevronDown, ChevronRight,
  Euro, TrendingUp, TrendingDown, HardHat, Clock,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface JournaalRegel {
  datum: string;
  rubriekCode: string;
  rubriekOmschr: string;
  bedrag: number;
  omschrijving: string | null;
  debetCredit?: string;
}

interface UrenRegel {
  medewerker: string;
  datum: string;
  aantal: number;
  omschrijving: string | null;
}

interface KostenRegel {
  typeBreg: string;
  categorie: string;        // A / M / O / E
  datum: string | null;
  omschrijving: string | null;
  bedrag: number;
  dekkingen: number;
  factuurStatus: string | null;
  docCode: string | null;
  creNaam: string | null;
}

interface ProjectDetail {
  type: "project";
  project: {
    projectNr: string;
    naam: string;
    klant: string;
    projectleider: string;
    status: string;
    statusLabel: string;
    startdatum?: string | null;
  };
  berekening: {
    aanneemsom: number;
    gefactureerd: number;
    nogTeFactureren: number;
    pctGefact: number | null;
    urenTotaal: number;
    urenTarief: number;
    algKostenPct: number;
    kostenMateriaal?: number;
    kostenArbeid?: number;
    kostenOverig?: number;
    kostenDirect: number;
    kostenPakbon: number;
    kostenIndirect: number;
    kostenAlgemeen: number;
    totaleKosten: number;
    brutomarge: number;
    margePct: number;
    // AV_KOSTREG_2 per-categorie (voor A/M/O toggles)
    kostenArbeidCateg?: number;
    kostenMateriaalCateg?: number;
    kostenOverigCateg?: number;
  };
  kostenRegels: KostenRegel[];
  journaalOpbrengsten: JournaalRegel[];
  urenDetail: UrenRegel[];
  urenPerMedewerker: { medewerker: string; totaal: number }[];
  _kostenPeriode: string | null;
}

// ─── DB config ────────────────────────────────────────────────────────────────

const DB_LABELS: Record<string, string> = {
  SERVICES:      "Elmar Services",
  MAINTENANCE:   "Elmar Maintenance",
  INTERNATIONAL: "Elmar International",
  KEYSER:        "Keyser",
};

const DB_COLORS: Record<string, string> = {
  SERVICES:      "bg-blue-500/15 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/30",
  MAINTENANCE:   "bg-violet-500/15 text-violet-700 dark:text-violet-400 ring-1 ring-violet-500/30",
  INTERNATIONAL: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30",
  KEYSER:        "bg-orange-500/15 text-orange-700 dark:text-orange-400 ring-1 ring-orange-500/30",
};

// ─── Hulpcomponenten ──────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, positive, negative }: {
  label: string; value: string; sub?: string;
  positive?: boolean; negative?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-xl font-bold tabular-nums ${positive ? "text-emerald-600 dark:text-emerald-400" : negative ? "text-red-600 dark:text-red-400" : ""}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function SectionRow({ label, value, sub, indent = 0, bold = false, muted = false }: {
  label: string; value: string; sub?: string;
  indent?: number; bold?: boolean; muted?: boolean;
}) {
  return (
    <div className={`flex items-baseline justify-between py-1.5 ${indent > 0 ? `pl-${indent * 4}` : ""} ${muted ? "text-muted-foreground" : ""}`}>
      <span className={`text-sm ${bold ? "font-semibold" : ""}`}>{label}</span>
      <div className="text-right">
        <span className={`text-sm tabular-nums ${bold ? "font-semibold" : ""}`}>{value}</span>
        {sub && <span className="text-xs text-muted-foreground ml-2">{sub}</span>}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-border my-1" />;
}

// Toggle chip voor A/M/O
function ToggleChip({ label, active, onClick, color }: {
  label: string; active: boolean; onClick: () => void; color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
        active ? `${color} border-transparent` : "border-border text-muted-foreground opacity-50"
      }`}
    >
      {label}
    </button>
  );
}

// Groepeer kostenregels op categorie, dan leverancier/omschrijving
function groupKostenByCateg(regels: KostenRegel[], activeCats: Set<string>) {
  const categInfo: Record<string, { label: string; color: string }> = {
    A: { label: "Arbeid",    color: "bg-blue-500/10 text-blue-700" },
    M: { label: "Materiaal", color: "bg-orange-500/10 text-orange-700" },
    O: { label: "Overig",    color: "bg-slate-500/10 text-slate-700" },
  };

  const map: Record<string, { cat: string; label: string; color: string; totaal: number; regels: KostenRegel[] }> = {};
  for (const r of regels) {
    const cat = r.categorie === "E" ? "O" : (r.categorie in categInfo ? r.categorie : "O");
    if (!activeCats.has(cat)) continue;
    if (!map[cat]) {
      map[cat] = { cat, label: categInfo[cat].label, color: categInfo[cat].color, totaal: 0, regels: [] };
    }
    map[cat].totaal += r.bedrag;
    map[cat].regels.push(r);
  }
  return Object.values(map).sort((a, b) => b.totaal - a.totaal);
}

function KostenCategGroep({ groep }: { groep: ReturnType<typeof groupKostenByCateg>[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-2 px-3 rounded hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${groep.color}`}>{groep.label}</span>
          <span className="text-xs text-muted-foreground">{groep.regels.length} regels</span>
        </div>
        <span className="text-sm tabular-nums font-semibold">{formatCurrency(groep.totaal)}</span>
      </button>
      {open && (
        <div className="ml-6 mb-2 border-l border-border pl-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left py-1 pr-2 w-24">Datum</th>
                <th className="text-left py-1 pr-2">Leverancier / Omschrijving</th>
                <th className="text-left py-1 pr-2 w-10">Type</th>
                <th className="text-right py-1">Bedrag</th>
              </tr>
            </thead>
            <tbody>
              {groep.regels.map((r, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className="py-1.5 pr-2 font-mono text-muted-foreground">{r.datum ?? "—"}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground max-w-xs truncate">
                    {r.creNaam || r.omschrijving || r.docCode || "—"}
                  </td>
                  <td className="py-1.5 pr-2 text-muted-foreground font-mono">{r.typeBreg}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatCurrency(r.bedrag)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Groepeer journaalregels op rubriek (voor opbrengsten)
function groupByRubriek(regels: JournaalRegel[]) {
  const map: Record<string, { code: string; omschr: string; totaal: number; regels: JournaalRegel[] }> = {};
  for (const r of regels) {
    const key = r.rubriekCode;
    if (!map[key]) map[key] = { code: r.rubriekCode, omschr: r.rubriekOmschr, totaal: 0, regels: [] };
    map[key].totaal += r.bedrag;
    map[key].regels.push(r);
  }
  return Object.values(map).sort((a, b) => b.totaal - a.totaal);
}

function RubriekGroep({ groep }: { groep: ReturnType<typeof groupByRubriek>[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-2 px-3 rounded hover:bg-muted/40 transition-colors group"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="text-sm font-medium">{groep.omschr}</span>
          <span className="text-xs text-muted-foreground font-mono">{groep.code}</span>
        </div>
        <span className="text-sm tabular-nums font-medium">{formatCurrency(groep.totaal)}</span>
      </button>
      {open && (
        <div className="ml-6 mb-1 border-l border-border pl-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left py-1 pr-2 w-24">Datum</th>
                <th className="text-left py-1 pr-2">Omschrijving</th>
                <th className="text-right py-1">Bedrag</th>
              </tr>
            </thead>
            <tbody>
              {groep.regels.map((r, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className="py-1.5 pr-2 font-mono text-muted-foreground">{r.datum}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground max-w-xs truncate">{r.omschrijving || "—"}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatCurrency(r.bedrag)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MedewerkerGroep({ med, detail }: {
  med: { medewerker: string; totaal: number };
  detail: UrenRegel[];
  maxUren: number;
}) {
  const [open, setOpen] = useState(false);
  const regels = detail.filter(u => u.medewerker === med.medewerker);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-2 px-3 rounded hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="text-sm font-medium">{med.medewerker}</span>
        </div>
        <span className="text-sm tabular-nums font-medium">{med.totaal.toFixed(1)} u</span>
      </button>
      {open && (
        <div className="ml-6 mb-1 border-l border-border pl-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left py-1 pr-2 w-24">Datum</th>
                <th className="text-left py-1 pr-2">Omschrijving</th>
                <th className="text-right py-1">Uren</th>
              </tr>
            </thead>
            <tbody>
              {regels.map((r, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className="py-1.5 pr-2 font-mono text-muted-foreground">{r.datum}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground max-w-xs truncate">{r.omschrijving || "—"}</td>
                  <td className="py-1.5 text-right tabular-nums">{r.aantal.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Hoofdpagina ──────────────────────────────────────────────────────────────

export default function ManagementProjectDetail({
  params,
}: {
  params: Promise<{ database: string; id: string }>;
}) {
  const { database, id } = use(params);
  const router = useRouter();
  const projectNr = decodeURIComponent(id);

  // A/M/O kosten-toggles
  const [toggleA, setToggleA] = useState(true);
  const [toggleM, setToggleM] = useState(true);
  const [toggleO, setToggleO] = useState(true);

  const { data, isLoading, isError } = useQuery<ProjectDetail>({
    queryKey: ["mgm-project", database, projectNr],
    queryFn: () =>
      fetch(`/api/v1/management/project?projectNr=${encodeURIComponent(projectNr)}&database=${database}`)
        .then(r => { if (!r.ok) throw new Error("Niet gevonden"); return r.json(); }),
  });

  const b = data?.berekening;
  const p = data?.project;

  const activeCats = new Set<string>([
    ...(toggleA ? ["A"] : []),
    ...(toggleM ? ["M"] : []),
    ...(toggleO ? ["O"] : []),
  ]);

  // AV_KOSTREG_2 toggle-berekening
  const kostenA = toggleA ? (b?.kostenArbeidCateg ?? 0) : 0;
  const kostenM = toggleM ? (b?.kostenMateriaalCateg ?? 0) : 0;
  const kostenO = toggleO ? (b?.kostenOverigCateg ?? 0) : 0;
  const heeftKostenRegels = (data?.kostenRegels?.length ?? 0) > 0;

  // Als AV_KOSTREG_2 data beschikbaar is → gebruik die voor toggle-KPI
  // Anders val terug op journaal-based totalen
  const toggleKostenDirect = heeftKostenRegels ? (kostenA + kostenM + kostenO) : (b?.kostenDirect ?? 0);
  const toggleTotaleKosten  = toggleKostenDirect + (b?.kostenIndirect ?? 0) + (b?.kostenAlgemeen ?? 0);
  const toggleBrutomarge    = (b?.gefactureerd ?? 0) - toggleTotaleKosten;
  // Marge % = brutomarge ÷ gefactureerde omzet (niet ÷ kosten)
  const gefact = b?.gefactureerd ?? 0;
  const toggleMargePct = gefact > 0 ? toggleBrutomarge / gefact * 100 : 0;

  const kostenGroepen  = groupKostenByCateg(data?.kostenRegels ?? [], activeCats);
  const opbrGroepen    = groupByRubriek(data?.journaalOpbrengsten ?? []);
  const totJrnlOpbr    = (data?.journaalOpbrengsten ?? []).reduce((s, r) => s + r.bedrag, 0);
  const maxUren        = Math.max(...(data?.urenPerMedewerker ?? []).map(m => m.totaal), 1);

  return (
    <div className="space-y-6 pb-12 max-w-5xl">

      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <Button variant="outline" size="sm" className="mt-0.5" onClick={() => router.push(`/management/${database}`)}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />Terug
        </Button>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${DB_COLORS[database] ?? ""}`}>
              {DB_LABELS[database] ?? database}
            </span>
            {p && (
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${p.status === "ACTIEF" || ["A","I","U"].includes(p.status) ? "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30" : "bg-slate-500/15 text-slate-600 ring-1 ring-slate-500/30"}`}>
                {p.statusLabel}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold mt-1">{p?.naam ?? projectNr}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-0.5">
            <span className="font-mono text-xs">{projectNr}</span>
            {p?.klant && <span>Klant: <strong className="text-foreground">{p.klant}</strong></span>}
            {p?.projectleider && <span>Projectleider: <strong className="text-foreground">{p.projectleider}</strong></span>}
            {p?.startdatum && <span>Start: {p.startdatum}</span>}
          </div>
        </div>
      </div>

      {/* ── Laden / fout ── */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {isError && (
        <Card><CardContent className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-6 w-6" />
          <p>Project niet gevonden of fout bij laden.</p>
        </CardContent></Card>
      )}

      {data && b && (
        <>
          {/* ── KPI-kaarten (toggle-gevoelig) ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label="Aanneemsom"
              value={formatCurrency(b.aanneemsom)}
              sub={b.pctGefact !== null ? `${formatPercentage(b.pctGefact)} gefactureerd` : undefined}
            />
            <KpiCard
              label="Gefactureerd"
              value={formatCurrency(b.gefactureerd)}
              sub={b.nogTeFactureren > 0 ? `Nog: ${formatCurrency(b.nogTeFactureren)}` : "Volledig gefactureerd"}
            />
            <KpiCard
              label="Totale kosten"
              value={formatCurrency(toggleTotaleKosten)}
              sub={`Brutomarge: ${formatPercentage(toggleMargePct)}`}
            />
            <KpiCard
              label="Brutomarge"
              value={formatCurrency(toggleBrutomarge)}
              sub={formatPercentage(toggleMargePct)}
              positive={toggleBrutomarge > 0}
              negative={toggleBrutomarge < 0}
            />
          </div>

          {/* ── KOSTEN ── */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <HardHat className="h-4 w-4" />
                  Kosten
                </CardTitle>
                {/* A/M/O toggles — alleen voor project-type met AV_KOSTREG_2 data */}
                {data.type === "project" && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground mr-1">Categorie:</span>
                    <ToggleChip
                      label="Arbeid"
                      active={toggleA}
                      onClick={() => setToggleA(v => !v)}
                      color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    />
                    <ToggleChip
                      label="Materiaal"
                      active={toggleM}
                      onClick={() => setToggleM(v => !v)}
                      color="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                    />
                    <ToggleChip
                      label="Overig"
                      active={toggleO}
                      onClick={() => setToggleO(v => !v)}
                      color="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Samenvatting met toggle-berekening */}
              <div className="rounded-lg bg-muted/30 p-4 mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Samenvatting {heeftKostenRegels ? "(AV_KOSTREG_2)" : "(alle tijd)"}
                </p>
                {data.type === "project" && heeftKostenRegels && (
                  <>
                    {toggleA && <SectionRow label="Arbeid (A)"   value={formatCurrency(b.kostenArbeidCateg    ?? 0)} muted={!toggleA} />}
                    {toggleM && <SectionRow label="Materiaal (M)" value={formatCurrency(b.kostenMateriaalCateg ?? 0)} muted={!toggleM} />}
                    {toggleO && <SectionRow label="Overig (O)"   value={formatCurrency(b.kostenOverigCateg    ?? 0)} muted={!toggleO} />}
                    {!toggleA && !toggleM && !toggleO && (
                      <p className="text-sm text-muted-foreground py-1">Alle categorieën uitgeschakeld</p>
                    )}
                    <Divider />
                    <SectionRow label="Directe kosten totaal" value={formatCurrency(toggleKostenDirect)} bold />
                  </>
                )}
                {data.type === "project" && !heeftKostenRegels && (
                  <>
                    <SectionRow label="Materiaalkosten"        value={formatCurrency(b.kostenMateriaal ?? 0)} />
                    <SectionRow label="Arbeidskosten"          value={formatCurrency(b.kostenArbeid ?? 0)} />
                    <SectionRow label="Overige directe kosten" value={formatCurrency(b.kostenOverig ?? 0)} />
                    {b.kostenPakbon > 0 && (
                      <SectionRow label="Pakbonnen"            value={formatCurrency(b.kostenPakbon)} />
                    )}
                    <Divider />
                    <SectionRow label="Directe kosten totaal"  value={formatCurrency(b.kostenDirect + b.kostenPakbon)} bold />
                  </>
                )}
                <SectionRow
                  label={`Indirecte kosten (${b.urenTotaal.toFixed(1)} u × €${b.urenTarief.toFixed(2)})`}
                  value={formatCurrency(b.kostenIndirect)}
                />
                <SectionRow
                  label={`Algemene kosten (${b.algKostenPct}% van aanneemsom + meerwerk)`}
                  value={formatCurrency(b.kostenAlgemeen)}
                />
                <Divider />
                <SectionRow label="TOTALE KOSTEN" value={formatCurrency(toggleTotaleKosten)} bold />
              </div>

              {/* Kosten-regels detail (AV_KOSTREG_2) */}
              {data.type === "project" && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Kosten per categorie
                      {data._kostenPeriode && (
                        <span className="ml-1 normal-case font-normal">(gesynchroniseerde periode)</span>
                      )}
                    </p>
                    <span className="text-sm font-semibold tabular-nums">{formatCurrency(toggleKostenDirect)}</span>
                  </div>
                  {!heeftKostenRegels ? (
                    <p className="text-sm text-muted-foreground py-2 px-3">
                      Kosten-regels nog niet gesynchroniseerd. Start de worker opnieuw.
                    </p>
                  ) : kostenGroepen.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2 px-3">
                      Geen kosten zichtbaar voor de geselecteerde categorieën.
                    </p>
                  ) : (
                    <div className="space-y-0.5">
                      {kostenGroepen.map(g => <KostenCategGroep key={g.cat} groep={g} />)}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* ── OPBRENGSTEN ── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Euro className="h-4 w-4" />
                Opbrengsten / Facturen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted/30 p-4 mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Samenvatting (AT_KLNTBREG)</p>
                <SectionRow label="Gefactureerd"      value={formatCurrency(b.gefactureerd)} bold />
                <SectionRow label="Nog te factureren" value={formatCurrency(b.nogTeFactureren)}
                  muted={b.nogTeFactureren === 0}
                />
                {b.aanneemsom > 0 && (
                  <SectionRow
                    label="% gefactureerd van aanneemsom"
                    value={b.pctGefact !== null ? formatPercentage(b.pctGefact) : "—"}
                    muted
                  />
                )}
              </div>

              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Journaalboekingen opbrengsten
                </p>
                {totJrnlOpbr > 0 && (
                  <span className="text-sm font-semibold tabular-nums">{formatCurrency(totJrnlOpbr)}</span>
                )}
              </div>
              {opbrGroepen.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2 px-3">
                  Geen factuurboekingen beschikbaar voor de gesynchroniseerde periode.
                </p>
              ) : (
                <div className="space-y-0.5">
                  {opbrGroepen.map(g => <RubriekGroep key={g.code} groep={g} />)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── UREN ── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Uren
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted/30 p-4 mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Samenvatting (alle tijd)</p>
                <SectionRow
                  label={`Totaal uren (${b.urenTotaal.toFixed(1)} u × €${b.urenTarief.toFixed(2)})`}
                  value={formatCurrency(b.kostenIndirect)}
                  bold
                />
              </div>

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Per medewerker
              </p>
              {data.urenPerMedewerker.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2 px-3">
                  Geen uren beschikbaar voor de gesynchroniseerde periode.
                </p>
              ) : (
                <div className="space-y-0.5">
                  {data.urenPerMedewerker.map(med => (
                    <MedewerkerGroep
                      key={med.medewerker}
                      med={med}
                      detail={data.urenDetail}
                      maxUren={maxUren}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Marge-waterval ── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                {toggleBrutomarge >= 0
                  ? <TrendingUp className="h-4 w-4 text-emerald-600" />
                  : <TrendingDown className="h-4 w-4 text-red-600" />}
                Margeanalyse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <SectionRow label="Aanneemsom (contractwaarde)" value={formatCurrency(b.aanneemsom)} />
                <SectionRow label="Gefactureerd"                value={formatCurrency(b.gefactureerd)} />
                <Divider />
                {heeftKostenRegels ? (
                  <>
                    {toggleA && <SectionRow label="- Arbeid (A)"    value={`- ${formatCurrency(kostenA)}`} />}
                    {toggleM && <SectionRow label="- Materiaal (M)" value={`- ${formatCurrency(kostenM)}`} />}
                    {toggleO && <SectionRow label="- Overig (O)"    value={`- ${formatCurrency(kostenO)}`} />}
                  </>
                ) : (
                  <SectionRow label="Directe kosten" value={`- ${formatCurrency(b.kostenDirect + b.kostenPakbon)}`} />
                )}
                <SectionRow
                  label={`Indirecte kosten (${b.urenTotaal.toFixed(1)} u)`}
                  value={`- ${formatCurrency(b.kostenIndirect)}`}
                />
                <SectionRow
                  label={`Algemene kosten (${b.algKostenPct}%)`}
                  value={`- ${formatCurrency(b.kostenAlgemeen)}`}
                />
                <Divider />
                <SectionRow
                  label="BRUTOMARGE"
                  value={formatCurrency(toggleBrutomarge)}
                  sub={formatPercentage(toggleMargePct)}
                  bold
                />
                {b.aanneemsom > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Kostenbenutting</span>
                      <span>{formatPercentage(toggleTotaleKosten / b.aanneemsom * 100)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${toggleBrutomarge >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
                        style={{ width: `${Math.min(100, Math.max(0, toggleTotaleKosten / b.aanneemsom * 100))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </>
      )}
    </div>
  );
}

"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, Loader2, AlertCircle, ChevronDown, ChevronRight,
  Euro, TrendingUp, TrendingDown, HardHat, ReceiptText, Clock,
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

interface ProjectDetail {
  type: "project" | "werkbon";
  project: {
    projectNr: string;
    naam: string;
    klant: string;
    projectleider: string;
    status: string;
    statusLabel: string;
    startdatum?: string | null;
    datum?: string | null;
    isGefactureerd?: boolean;
    werkCode?: string | null;
    taakCode?: string | null;
    fase?: string | null;
  };
  berekening: {
    aanneemsom: number;
    gefactureerd: number;
    onbetaald?: number;
    betaald?: number;
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
    pctBetaald: number | null;
    urenWerkbon?: number;
    urenContract?: number;
  };
  journaalKosten: JournaalRegel[];
  journaalOpbrengsten: JournaalRegel[];
  urenDetail: UrenRegel[];
  urenPerMedewerker: { medewerker: string; totaal: number }[];
  _journaalPeriode: string | null;
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

// Groepeer journaalregels op rubriek
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

  const { data, isLoading, isError } = useQuery<ProjectDetail>({
    queryKey: ["mgm-project", database, projectNr],
    queryFn: () =>
      fetch(`/api/v1/management/project?projectNr=${encodeURIComponent(projectNr)}&database=${database}`)
        .then(r => { if (!r.ok) throw new Error("Niet gevonden"); return r.json(); }),
  });

  const b = data?.berekening;
  const p = data?.project;

  const kostenGroepen = groupByRubriek(data?.journaalKosten ?? []);
  const opbrGroepen   = groupByRubriek(data?.journaalOpbrengsten ?? []);
  const maxUren       = Math.max(...(data?.urenPerMedewerker ?? []).map(m => m.totaal), 1);
  const totJrnlKosten = (data?.journaalKosten ?? []).reduce((s, r) => s + r.bedrag, 0);
  const totJrnlOpbr   = (data?.journaalOpbrengsten ?? []).reduce((s, r) => s + r.bedrag, 0);

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
            {p?.datum && <span>Datum: {p.datum}</span>}
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
          {/* ── KPI-kaarten ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label="Aanneemsom"
              value={formatCurrency(b.aanneemsom)}
              sub={b.pctBetaald !== null ? `${formatPercentage(b.pctBetaald)} gefactureerd` : undefined}
            />
            <KpiCard
              label="Gefactureerd"
              value={formatCurrency(b.gefactureerd)}
              sub={b.betaald !== undefined ? `Betaald: ${formatCurrency(b.betaald)}` : undefined}
            />
            <KpiCard
              label="Totale kosten"
              value={formatCurrency(b.totaleKosten)}
              sub={`Marge: ${formatPercentage(b.margePct)}`}
            />
            <KpiCard
              label="Brutomarge"
              value={formatCurrency(b.brutomarge)}
              sub={formatPercentage(b.margePct)}
              positive={b.brutomarge > 0}
              negative={b.brutomarge < 0}
            />
          </div>

          {/* ── KOSTEN ── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <HardHat className="h-4 w-4" />
                Kosten
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Samenvatting (all-time, uit rm_project_summary) */}
              <div className="rounded-lg bg-muted/30 p-4 mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Samenvatting (alle tijd)</p>
                {data.type === "project" && (
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
                {data.type === "werkbon" && (
                  <>
                    <SectionRow
                      label={`Indirecte uren (werkbon: ${(b.urenWerkbon ?? 0).toFixed(1)} u)`}
                      value={formatCurrency((b.urenWerkbon ?? 0) * b.urenTarief)}
                    />
                    <SectionRow
                      label={`Indirecte uren (contract: ${(b.urenContract ?? 0).toFixed(1)} u)`}
                      value={formatCurrency((b.urenContract ?? 0) * b.urenTarief)}
                    />
                    <Divider />
                  </>
                )}
                <SectionRow
                  label={`Indirecte kosten (${b.urenTotaal.toFixed(1)} u × €${b.urenTarief.toFixed(2)})`}
                  value={formatCurrency(b.kostenIndirect)}
                />
                <SectionRow
                  label={`Algemene kosten (${b.algKostenPct}% × aanneemsom)`}
                  value={formatCurrency(b.kostenAlgemeen)}
                />
                <Divider />
                <SectionRow label="TOTALE KOSTEN" value={formatCurrency(b.totaleKosten)} bold />
              </div>

              {/* Journaal detail (laatste 365 dagen) */}
              {data.type === "project" && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Journaalboekingen kosten
                      {data._journaalPeriode && (
                        <span className="ml-1 normal-case font-normal">(laatste {data._journaalPeriode})</span>
                      )}
                    </p>
                    {totJrnlKosten > 0 && (
                      <span className="text-sm font-semibold tabular-nums">{formatCurrency(totJrnlKosten)}</span>
                    )}
                  </div>
                  {kostenGroepen.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2 px-3">
                      Geen journaalboekingen beschikbaar voor de gesynchroniseerde periode.
                    </p>
                  ) : (
                    <div className="space-y-0.5">
                      {kostenGroepen.map(g => <RubriekGroep key={g.code} groep={g} />)}
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
              {/* Samenvatting */}
              <div className="rounded-lg bg-muted/30 p-4 mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Samenvatting (alle tijd)</p>
                <SectionRow label="Gefactureerd"  value={formatCurrency(b.gefactureerd)} bold />
                {b.betaald !== undefined && (
                  <>
                    <SectionRow label="Betaald"   value={formatCurrency(b.betaald)} />
                    <SectionRow label="Openstaand" value={formatCurrency(b.onbetaald ?? 0)}
                      muted={(b.onbetaald ?? 0) === 0}
                    />
                  </>
                )}
                {data.type === "werkbon" && (
                  <SectionRow
                    label="Betaalstatus"
                    value={p?.isGefactureerd ? "Volledig gefactureerd" : "Nog niet gefactureerd"}
                  />
                )}
              </div>

              {/* Journaal opbrengsten */}
              {data.type === "project" && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Journaalboekingen opbrengsten
                      {data._journaalPeriode && (
                        <span className="ml-1 normal-case font-normal">(laatste {data._journaalPeriode})</span>
                      )}
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
                </>
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

              {data.type === "project" && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Per medewerker
                    {data._journaalPeriode && (
                      <span className="ml-1 normal-case font-normal">(laatste {data._journaalPeriode})</span>
                    )}
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
                </>
              )}

              {data.type === "werkbon" && b.urenTotaal === 0 && (
                <p className="text-sm text-muted-foreground py-2 px-3">
                  Geen uren geregistreerd.
                </p>
              )}
            </CardContent>
          </Card>

          {/* ── Marge-waterval ── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                {b.brutomarge >= 0
                  ? <TrendingUp className="h-4 w-4 text-emerald-600" />
                  : <TrendingDown className="h-4 w-4 text-red-600" />}
                Margeanalyse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <SectionRow label="Aanneemsom (contractwaarde)"  value={formatCurrency(b.aanneemsom)} />
                <SectionRow label="Gefactureerd"                 value={formatCurrency(b.gefactureerd)} />
                <Divider />
                {data.type === "project" && (
                  <>
                    <SectionRow label="Directe kosten"           value={`- ${formatCurrency(b.kostenDirect)}`} />
                    {b.kostenPakbon > 0 && (
                      <SectionRow label="Pakbonnen"              value={`- ${formatCurrency(b.kostenPakbon)}`} />
                    )}
                  </>
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
                  value={formatCurrency(b.brutomarge)}
                  sub={formatPercentage(b.margePct)}
                  bold
                />
                {b.aanneemsom > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Kostenbenutting</span>
                      <span>{formatPercentage(b.totaleKosten / b.aanneemsom * 100)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${b.brutomarge >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
                        style={{ width: `${Math.min(100, Math.max(0, b.totaleKosten / b.aanneemsom * 100))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Werkbon metadata ── */}
          {data.type === "werkbon" && p && (p.werkCode || p.taakCode || p.fase) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ReceiptText className="h-4 w-4" />
                  Werkbon details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {p.werkCode && (
                    <div><p className="text-xs text-muted-foreground">Werkcode</p><p className="font-medium">{p.werkCode}</p></div>
                  )}
                  {p.taakCode && (
                    <div><p className="text-xs text-muted-foreground">Taakcode</p><p className="font-medium">{p.taakCode}</p></div>
                  )}
                  {p.fase && (
                    <div><p className="text-xs text-muted-foreground">Fase</p><p className="font-medium">{p.fase}</p></div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

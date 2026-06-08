"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Euro, TrendingUp, FolderKanban, AlertTriangle, PieChart,
  ChevronRight, Building2, ArrowUpRight, SlidersHorizontal,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbStats {
  database: string;
  label: string;
  aanneemsom: number;
  gefactureerd: number;
  totaleKosten: number;
  brutomarge: number;
  margePct: number;
  nietGefactureerd: number;
  nietGefactureerdPct: number;
  actief: number;
  totaal: number;
  source: "read-model" | "mock" | "not-connected";
  directeKosten: number;
  pakbonKosten: number;
  indirecteKosten: number;
  algemeenKosten: number;
}

interface SamenvattingResponse {
  filters: { status: string; database: string };
  perDatabase: DbStats[];
  totaal: DbStats & { margePct: number; nietGefactureerdPct: number };
}

type Toggles = { directe: boolean; pakbon: boolean; indirect: boolean; algemeen: boolean };

// ─── DB colour config ─────────────────────────────────────────────────────────

const DB_COLORS: Record<string, { dot: string; badge: string; row: string }> = {
  SERVICES:      { dot: "bg-blue-500",    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500/30",     row: "hover:bg-blue-50/40 dark:hover:bg-blue-950/20" },
  MAINTENANCE:   { dot: "bg-violet-500",  badge: "bg-violet-500/15 text-violet-700 dark:text-violet-400 ring-1 ring-violet-500/30", row: "hover:bg-violet-50/40 dark:hover:bg-violet-950/20" },
  INTERNATIONAL: { dot: "bg-emerald-500", badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30", row: "hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20" },
  KEYSER:        { dot: "bg-orange-500",  badge: "bg-orange-500/15 text-orange-700 dark:text-orange-400 ring-1 ring-orange-500/30", row: "hover:bg-orange-50/40 dark:hover:bg-orange-950/20" },
};

function margeCls(v: number) {
  return v >= 15 ? "text-emerald-600 dark:text-emerald-400 font-semibold" : v >= 0 ? "" : "text-red-600 dark:text-red-400 font-semibold";
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
        active
          ? "bg-blue-600 text-white border-blue-600"
          : "border-border text-muted-foreground hover:border-blue-400"
      }`}
    >
      {label}
    </button>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color = "blue",
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color?: "blue" | "green" | "orange" | "red" | "slate";
}) {
  const iconCls = {
    blue:   "text-blue-600 dark:text-blue-400",
    green:  "text-emerald-600 dark:text-emerald-400",
    orange: "text-orange-600 dark:text-orange-400",
    red:    "text-red-600 dark:text-red-400",
    slate:  "text-slate-500",
  }[color];

  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-3.5 w-3.5 shrink-0 ${iconCls}`} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
        <p className={`text-xl font-bold tabular-nums ${iconCls}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Kosten-toggles panel ─────────────────────────────────────────────────────

function KostenTogglesPanel({
  totaal, toggles, setToggles,
}: {
  totaal: DbStats & { margePct: number; nietGefactureerdPct: number };
  toggles: Toggles;
  setToggles: React.Dispatch<React.SetStateAction<Toggles>>;
}) {
  const toggle = (k: keyof Toggles) => setToggles(t => ({ ...t, [k]: !t[k] }));
  const allOn  = Object.values(toggles).every(Boolean);

  const items: { key: keyof Toggles; label: string; amount: number }[] = [
    { key: "directe",  label: "Directe kosten",   amount: totaal.directeKosten },
    { key: "pakbon",   label: "Pakbonnen",          amount: totaal.pakbonKosten },
    { key: "indirect", label: "Indirecte kosten",   amount: totaal.indirecteKosten },
    { key: "algemeen", label: "Alg. kosten (5%)",   amount: totaal.algemeenKosten },
  ];

  return (
    <Card className="border-dashed border-blue-200/60 dark:border-blue-800/40">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Kosten-toggles — simulatie weergave
            </span>
          </div>
          {!allOn && (
            <button
              onClick={() => setToggles({ directe: true, pakbon: true, indirect: true, algemeen: true })}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Alles aan
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map(({ key, label, amount }) => {
            const on = toggles[key];
            return (
              <button
                key={key}
                onClick={() => toggle(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                  on
                    ? "bg-card border-border hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-950/20"
                    : "bg-muted/60 border-border/50 text-muted-foreground/50"
                }`}
              >
                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${on ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                <span className={on ? "" : "line-through"}>{label}</span>
                <span className={`font-mono tabular-nums ${on ? "text-foreground" : "text-muted-foreground/40"}`}>
                  {formatCurrency(amount)}
                </span>
              </button>
            );
          })}
        </div>
        {!allOn && (
          <p className="text-[11px] text-muted-foreground/60 mt-2">
            Puur weergave — geen data-wijziging. Uitgeschakelde kostensoorten tellen niet mee in totale kosten en marge.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function applyToggles(d: DbStats, toggles: Toggles) {
  if (d.source === "not-connected") return { totaleKosten: 0, brutomarge: 0, margePct: 0 };
  const totaal = (toggles.directe  ? d.directeKosten   : 0)
               + (toggles.pakbon   ? d.pakbonKosten     : 0)
               + (toggles.indirect ? d.indirecteKosten  : 0)
               + (toggles.algemeen ? d.algemeenKosten   : 0);
  const marge    = d.gefactureerd - totaal;
  const margePct = totaal > 0 ? marge / totaal * 100 : 0;
  return { totaleKosten: totaal, brutomarge: marge, margePct };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ManagementPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"actueel" | "historisch">("actueel");
  const [toggles, setToggles] = useState<Toggles>({ directe: true, pakbon: true, indirect: true, algemeen: true });

  const { data, isLoading } = useQuery<SamenvattingResponse>({
    queryKey: ["mgm-samenvatting", status],
    queryFn: () =>
      fetch(`/api/v1/management/samenvatting?status=${status}`).then(r => {
        if (!r.ok) throw new Error("Geen toegang");
        return r.json();
      }),
  });

  const { data: me } = useQuery<{ role: string }>({
    queryKey: ["me"],
    queryFn: () => fetch("/api/auth/me").then(r => r.json()),
    staleTime: 60_000,
  });
  const isMgm = me?.role === "MGM" || me?.role === "ADMIN";

  const rawDbs  = data?.perDatabase ?? [];
  const rawTotaal = data?.totaal;

  // Effective values per database, applying toggle state
  const dbs = rawDbs.map(d => {
    const eff = applyToggles(d, toggles);
    return { ...d, ...eff };
  });

  // Effective consolidated totals
  const connectedDbs = dbs.filter(d => d.source !== "not-connected");
  const effectiefTotaal = connectedDbs.reduce(
    (acc, d) => ({
      aanneemsom:       acc.aanneemsom       + d.aanneemsom,
      gefactureerd:     acc.gefactureerd     + d.gefactureerd,
      totaleKosten:     acc.totaleKosten     + d.totaleKosten,
      brutomarge:       acc.brutomarge       + d.brutomarge,
      actief:           acc.actief           + d.actief,
      totaal:           acc.totaal           + d.totaal,
      nietGefactureerd: acc.nietGefactureerd + d.nietGefactureerd,
    }),
    { aanneemsom: 0, gefactureerd: 0, totaleKosten: 0, brutomarge: 0, actief: 0, totaal: 0, nietGefactureerd: 0 }
  );
  const effectiefMargePct    = effectiefTotaal.totaleKosten > 0 ? effectiefTotaal.brutomarge / effectiefTotaal.totaleKosten * 100 : 0;
  const effectiefNietGefPct  = effectiefTotaal.aanneemsom   > 0 ? effectiefTotaal.nietGefactureerd / effectiefTotaal.aanneemsom * 100 : 0;

  // Combined totaal for display (effective values merged with raw for non-toggle fields)
  const t = rawTotaal ? {
    ...rawTotaal,
    totaleKosten:        effectiefTotaal.totaleKosten,
    brutomarge:          effectiefTotaal.brutomarge,
    margePct:            effectiefMargePct,
    aanneemsom:          effectiefTotaal.aanneemsom,
    gefactureerd:        effectiefTotaal.gefactureerd,
    actief:              effectiefTotaal.actief,
    totaal:              effectiefTotaal.totaal,
    nietGefactureerd:    effectiefTotaal.nietGefactureerd,
    nietGefactureerdPct: effectiefNietGefPct,
  } : null;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PieChart className="h-5 w-5 text-blue-600" />
            <h1 className="text-2xl font-bold">Management Dashboard</h1>
          </div>
          <p className="text-sm text-muted-foreground">Geconsolideerd overzicht over alle bedrijven · Lees-alleen</p>
        </div>

        {/* Filter: status */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Status:</span>
          <FilterChip label="Actueel" active={status === "actueel"} onClick={() => setStatus("actueel")} />
          <FilterChip label="Historisch" active={status === "historisch"} onClick={() => setStatus("historisch")} />
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-muted rounded-xl" />)}
          </div>
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      )}

      {!isLoading && t && rawTotaal && (
        <>
          {/* Kosten-toggles — alleen zichtbaar voor MGM/ADMIN */}
          {isMgm && (
            <KostenTogglesPanel totaal={rawTotaal} toggles={toggles} setToggles={setToggles} />
          )}

          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard label="Totale aanneemsom"    value={formatCurrency(t.aanneemsom)}   icon={Building2} color="blue" sub={`${t.actief} actieve projecten`} />
            <KpiCard label="Totaal gefactureerd"  value={formatCurrency(t.gefactureerd)} icon={Euro}      color="blue" />
            <KpiCard label="Totale brutomarge"    value={formatCurrency(t.brutomarge)}   icon={TrendingUp} color={t.brutomarge >= 0 ? "green" : "red"} />
            <KpiCard label="Gem. marge %"         value={formatPercentage(t.margePct)}   icon={TrendingUp} color={t.margePct >= 10 ? "green" : "orange"} />
            <KpiCard label="Niet-gefactureerd"    value={formatCurrency(t.nietGefactureerd)} icon={AlertTriangle} color={t.nietGefactureerd > 0 ? "orange" : "slate"} sub={formatPercentage(t.nietGefactureerdPct)} />
          </div>

          {/* Signaal-box: aanneemsom vs gefactureerd */}
          {t.nietGefactureerd > 0 && (
            <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/60 dark:bg-orange-950/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-semibold text-orange-800 dark:text-orange-400">
                  Openstaande orderwaarde — Aanneemsom ≠ Gefactureerd
                </span>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                {dbs.filter(d => d.nietGefactureerd > 0).map(d => (
                  <div key={d.database} className="flex items-center gap-1.5 text-sm">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${DB_COLORS[d.database]?.dot ?? "bg-slate-500"}`} />
                    <span className="text-muted-foreground">{d.label}:</span>
                    <span className="font-semibold text-orange-700 dark:text-orange-400">{formatCurrency(d.nietGefactureerd)}</span>
                    <span className="text-xs text-muted-foreground">({formatPercentage(d.nietGefactureerdPct)})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-database table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Overzicht per bedrijf
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Bedrijf</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Projecten</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Aanneemsom</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Gefactureerd</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Niet-gefact.</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Totale kosten</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Brutomarge</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Marge %</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbs.map(d => (
                      <tr
                        key={d.database}
                        onClick={() => router.push(`/management/${d.database}`)}
                        className={`border-b cursor-pointer transition-colors ${DB_COLORS[d.database]?.row ?? "hover:bg-muted/30"}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${DB_COLORS[d.database]?.dot ?? "bg-slate-500"}`} />
                            <span className="font-medium">{d.label}</span>
                            {d.source === "mock" && (
                              <span className="text-[10px] text-muted-foreground/60 italic">mock</span>
                            )}
                            {d.source === "not-connected" && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">niet gekoppeld</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {d.source === "not-connected" ? "—" : `${d.actief} actief / ${d.totaal} totaal`}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {d.source === "not-connected" ? "—" : formatCurrency(d.aanneemsom)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {d.source === "not-connected" ? "—" : formatCurrency(d.gefactureerd)}
                        </td>
                        <td className={`px-4 py-3 text-right tabular-nums ${d.source === "not-connected" ? "text-muted-foreground" : d.nietGefactureerd > 0 ? "text-orange-600 dark:text-orange-400 font-semibold" : d.nietGefactureerd < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                          {d.source === "not-connected" ? "—" : d.nietGefactureerd !== 0 ? (
                            <>
                              {formatCurrency(d.nietGefactureerd)}
                              {d.nietGefactureerdPct !== 0 && (
                                <span className={`block text-[11px] ${d.nietGefactureerd > 0 ? "text-orange-500/70" : "text-emerald-500/70"}`}>
                                  {formatPercentage(d.nietGefactureerdPct)}
                                </span>
                              )}
                            </>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {d.source === "not-connected" ? "—" : formatCurrency(d.totaleKosten)}
                        </td>
                        <td className={`px-4 py-3 text-right tabular-nums font-semibold ${d.source === "not-connected" ? "text-muted-foreground" : d.brutomarge >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {d.source === "not-connected" ? "—" : formatCurrency(d.brutomarge)}
                        </td>
                        <td className={`px-4 py-3 text-right tabular-nums ${d.source === "not-connected" ? "text-muted-foreground" : margeCls(d.margePct)}`}>
                          {d.source === "not-connected" ? "—" : formatPercentage(d.margePct)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 inline-block" />
                        </td>
                      </tr>
                    ))}

                    {/* Totaalrij */}
                    <tr className="bg-muted/30 font-semibold border-t-2">
                      <td className="px-4 py-3 text-muted-foreground" colSpan={2}>Totaal</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(t.aanneemsom)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(t.gefactureerd)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${t.nietGefactureerd > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}>
                        {t.nietGefactureerd > 0 ? formatCurrency(t.nietGefactureerd) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatCurrency(t.totaleKosten)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${t.brutomarge >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {formatCurrency(t.brutomarge)}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums ${margeCls(t.margePct)}`}>
                        {formatPercentage(t.margePct)}
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Quick-access cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {dbs.map(d => (
              <button
                key={d.database}
                onClick={() => router.push(`/management/${d.database}`)}
                className={`rounded-xl border p-4 text-left transition-all hover:shadow-md group ${DB_COLORS[d.database]?.row ?? ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${DB_COLORS[d.database]?.badge ?? ""}`}>
                    {d.label}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
                {d.source === "not-connected" ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mt-1">Nog niet gekoppeld</p>
                ) : (
                  <>
                    <p className="text-lg font-bold tabular-nums">{formatCurrency(d.brutomarge)}</p>
                    <p className="text-xs text-muted-foreground">marge {formatPercentage(d.margePct)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{d.actief} actief / {d.totaal} projecten</p>
                  </>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

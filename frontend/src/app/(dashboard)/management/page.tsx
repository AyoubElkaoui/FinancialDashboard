"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Euro, TrendingUp, FolderKanban, AlertTriangle, PieChart,
  ChevronRight, Building2, ArrowUpRight,
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
  source: string;
}

interface SamenvattingResponse {
  filters: { status: string; database: string };
  perDatabase: DbStats[];
  totaal: DbStats & { margePct: number; nietGefactureerdPct: number };
}

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ManagementPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"actueel" | "historisch">("actueel");

  const { data, isLoading } = useQuery<SamenvattingResponse>({
    queryKey: ["mgm-samenvatting", status],
    queryFn: () =>
      fetch(`/api/v1/management/samenvatting?status=${status}`).then(r => {
        if (!r.ok) throw new Error("Geen toegang");
        return r.json();
      }),
  });

  const t = data?.totaal;
  const dbs = data?.perDatabase ?? [];

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

      {!isLoading && t && (
        <>
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
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {d.actief} actief / {d.totaal} totaal
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(d.aanneemsom)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(d.gefactureerd)}</td>
                        <td className={`px-4 py-3 text-right tabular-nums ${d.nietGefactureerd > 0 ? "text-orange-600 dark:text-orange-400 font-semibold" : "text-muted-foreground"}`}>
                          {d.nietGefactureerd > 0 ? formatCurrency(d.nietGefactureerd) : "—"}
                          {d.nietGefactureerdPct > 0 && (
                            <span className="block text-[11px] text-orange-500/70">{formatPercentage(d.nietGefactureerdPct)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatCurrency(d.totaleKosten)}</td>
                        <td className={`px-4 py-3 text-right tabular-nums font-semibold ${d.brutomarge >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {formatCurrency(d.brutomarge)}
                        </td>
                        <td className={`px-4 py-3 text-right tabular-nums ${margeCls(d.margePct)}`}>
                          {formatPercentage(d.margePct)}
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
                <p className="text-lg font-bold tabular-nums">{formatCurrency(d.brutomarge)}</p>
                <p className="text-xs text-muted-foreground">marge {formatPercentage(d.margePct)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{d.actief} actief / {d.totaal} projecten</p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

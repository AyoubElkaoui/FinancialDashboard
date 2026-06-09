"use client";

import { useQuery } from "@tanstack/react-query";
import { inkoopApi } from "@/lib/api-client";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { useActiveDb } from "@/hooks/use-active-db";
import { useViewTypeSafe } from "@/hooks/use-view-type-safe";
import { useRole } from "@/hooks/use-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { CHART_COLORS } from "@/lib/chart-colors";
import { TrendingUp, Euro, BarChart3, Building2 } from "lucide-react";

// ── Utility: top N + "Overig" ─────────────────────────────────────────────────

function topNOverig<T extends { name: string; value: number }>(data: T[], n = 8): { name: string; value: number }[] {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  if (sorted.length <= n) return sorted;
  const top  = sorted.slice(0, n);
  const rest = sorted.slice(n).reduce((s, r) => s + r.value, 0);
  return [...top, { name: "Overig", value: rest }];
}

// ── Management Kosten view (MGM rol) ─────────────────────────────────────────

interface DbStats {
  database: string; label: string; source: string;
  directeKosten: number; pakbonKosten: number;
  indirecteKosten: number; algemeenKosten: number;
  totaleKosten: number; brutomarge: number; margePct: number;
  gefactureerd: number; aanneemsom: number;
}
interface SamenvattingResponse {
  perDatabase: DbStats[];
  totaal: DbStats & { margePct: number };
}

const DB_COLORS: Record<string, string> = {
  SERVICES:      "#3b82f6",
  MAINTENANCE:   "#8b5cf6",
  INTERNATIONAL: "#10b981",
  KEYSER:        "#f59e0b",
};

function ManagementKostenPage() {
  const { data, isLoading } = useQuery<SamenvattingResponse>({
    queryKey: ["mgm-samenvatting"],
    queryFn: () => fetch("/api/v1/management/samenvatting?status=alle").then(r => r.json()),
    staleTime: 60_000,
  });

  const dbs = (data?.perDatabase ?? []).filter(d => d.source !== "not-connected");
  const t   = data?.totaal;

  // Staafgrafiek: kostensoort per database
  const barData = dbs.map(d => ({
    name:      d.label,
    Directe:   d.directeKosten,
    Pakbon:    d.pakbonKosten,
    Indirect:  d.indirecteKosten,
    Algemeen:  d.algemeenKosten,
  }));

  // Taart: verdeling kostensoorten (totaal)
  const pieData = t ? topNOverig([
    { name: "Directe kosten",   value: t.directeKosten },
    { name: "Pakbon kosten",    value: t.pakbonKosten },
    { name: "Indirecte kosten", value: t.indirecteKosten },
    { name: "Alg. kosten",      value: t.algemeenKosten },
  ].filter(x => x.value > 0)) : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Kosten — Management</h1></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold">Kosten — Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Geconsolideerd kostenoverzicht over alle bedrijven</p>
      </div>

      {/* KPI-rij */}
      {t && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Totale kosten",     value: formatCurrency(t.totaleKosten),   icon: BarChart3, color: "text-slate-600" },
            { label: "Directe kosten",    value: formatCurrency(t.directeKosten),  icon: Euro,      color: "text-blue-600" },
            { label: "Indirecte kosten",  value: formatCurrency(t.indirecteKosten),icon: TrendingUp, color: "text-violet-600" },
            { label: "Gem. brutomarge %", value: formatPercentage(t.gefactureerd > 0 ? t.brutomarge / t.gefactureerd * 100 : 0), icon: TrendingUp, color: t.brutomarge >= 0 ? "text-emerald-600" : "text-red-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
                </div>
                <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Grafieken */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Staaf: per bedrijf */}
        <Card className="xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Kostenopbouw per bedrijf</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `€${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} width={52} />
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Directe"  name="Directe kosten"   stackId="a" fill="#3b82f6" />
                <Bar dataKey="Pakbon"   name="Pakbon kosten"    stackId="a" fill="#06b6d4" />
                <Bar dataKey="Indirect" name="Indirecte kosten" stackId="a" fill="#8b5cf6" />
                <Bar dataKey="Algemeen" name="Alg. kosten"      stackId="a" fill="#f59e0b" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Taart: kostensoort verdeling */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Verdeling kostensoorten</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={95} paddingAngle={2} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-1">
              {pieData.map((d, i) => {
                const tot = pieData.reduce((s, x) => s + x.value, 0);
                const pct = tot > 0 ? d.value / tot * 100 : 0;
                return (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </span>
                    <span className="tabular-nums font-medium">{formatCurrency(d.value)} <span className="text-muted-foreground">({pct.toFixed(0)}%)</span></span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per bedrijf tabel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Detail per bedrijf
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {["Bedrijf", "Directe k.", "Pakbon k.", "Indirecte k.", "Alg. k.", "Totale kosten", "Gefactureerd", "Brutomarge", "Marge %"].map((h, i) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dbs.map(d => (
                  <tr key={d.database} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: DB_COLORS[d.database] ?? "#64748b" }} />
                        <span className="font-medium">{d.label}</span>
                      </div>
                    </td>
                    {[d.directeKosten, d.pakbonKosten, d.indirecteKosten, d.algemeenKosten, d.totaleKosten, d.gefactureerd].map((v, i) => (
                      <td key={i} className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatCurrency(v)}</td>
                    ))}
                    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${d.brutomarge >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"}`}>
                      {formatCurrency(d.brutomarge)}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${d.margePct >= 15 ? "text-emerald-600 font-semibold" : d.margePct < 0 ? "text-red-600 font-semibold" : ""}`}>
                      {formatPercentage(d.margePct)}
                    </td>
                  </tr>
                ))}
                {t && (
                  <tr className="border-t-2 bg-muted/30 font-semibold">
                    <td className="px-4 py-3 text-muted-foreground">Totaal</td>
                    {[t.directeKosten, t.pakbonKosten, t.indirecteKosten, t.algemeenKosten, t.totaleKosten, t.gefactureerd].map((v, i) => (
                      <td key={i} className="px-4 py-3 text-right tabular-nums">{formatCurrency(v)}</td>
                    ))}
                    <td className={`px-4 py-3 text-right tabular-nums ${t.brutomarge >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"}`}>{formatCurrency(t.brutomarge)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${t.margePct >= 15 ? "text-emerald-600" : t.margePct < 0 ? "text-red-600" : ""}`}>{formatPercentage(t.margePct)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Maintenance kosten (echte data via rm_kosten_regel) ───────────────────────

interface KostenRow { KOSTENSOORT: string; BEDRAG: number; PCT: number }

function MaintenanceKostenPage() {
  const { data, isLoading } = useQuery<KostenRow[]>({
    queryKey: ["inkoop", "per-kostensoort", "MAINTENANCE"],
    queryFn: () => fetch("/api/v1/inkoop/per-kostensoort?database=MAINTENANCE").then(r => r.json()),
    staleTime: 60_000,
  });

  const rawRows = data ?? [];
  const totaal  = rawRows.reduce((s, r) => s + r.BEDRAG, 0);
  const rows    = rawRows.map(r => ({ ...r, PCT: totaal > 0 ? r.BEDRAG / totaal * 100 : 0 }));
  const topRows = topNOverig(rows.map(r => ({ name: r.KOSTENSOORT, value: r.BEDRAG })));

  if (isLoading) return <div className="h-64 bg-muted animate-pulse rounded-xl" />;

  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Kosten — Maintenance</h1>
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Geen kostendata beschikbaar. Synchroniseer eerst de Maintenance database.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold">Kosten — Maintenance</h1>
        <p className="text-sm text-muted-foreground mt-1">Kostenopbouw per categorie</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader><CardTitle className="text-sm">Totale kosten</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{formatCurrency(totaal)}</p>
            <p className="text-xs text-muted-foreground mt-1">{rows.length} categorieën</p>
          </CardContent>
        </Card>
        {rows.slice(0, 2).map((r, i) => (
          <Card key={r.KOSTENSOORT}>
            <CardHeader><CardTitle className="text-sm">{r.KOSTENSOORT}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums" style={{ color: CHART_COLORS[i] }}>{formatCurrency(r.BEDRAG)}</p>
              <p className="text-xs text-muted-foreground mt-1">{r.PCT.toFixed(1)}% van totaal</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <KostenCharts rows={topRows} />
      <KostenTabel rows={rows} totaal={totaal} />
    </div>
  );
}

// ── Project kosten (reguliere gebruikers) ─────────────────────────────────────

function ProjectKostenPage({ activeDb }: { activeDb: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["inkoop", "per-kostensoort", activeDb],
    queryFn:  () => inkoopApi.perKostensoort() as Promise<{ KOSTENSOORT: string; BEDRAG: number }[]>,
  });

  const rawRows = data ?? [];
  const totaal  = rawRows.reduce((s, r) => s + r.BEDRAG, 0);
  const rows    = rawRows.map(r => ({ KOSTENSOORT: r.KOSTENSOORT, BEDRAG: r.BEDRAG, PCT: totaal > 0 ? r.BEDRAG / totaal * 100 : 0 }));
  const topRows = topNOverig(rows.map(r => ({ name: r.KOSTENSOORT, value: r.BEDRAG })));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kosten</h1>
        <p className="text-sm text-muted-foreground mt-1">Kostenopbouw per categorie — {activeDb}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader><CardTitle className="text-sm">Totale kosten</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{formatCurrency(totaal)}</p>
            <p className="text-xs text-muted-foreground mt-1">{rows.length} kostensoorten</p>
          </CardContent>
        </Card>
        {rows.slice(0, 2).map((r, i) => (
          <Card key={r.KOSTENSOORT}>
            <CardHeader><CardTitle className="text-sm">{r.KOSTENSOORT}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums" style={{ color: CHART_COLORS[i] }}>{formatCurrency(r.BEDRAG)}</p>
              <p className="text-xs text-muted-foreground mt-1">{r.PCT.toFixed(1)}% van totaal</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading
        ? <div className="h-64 animate-pulse bg-muted rounded" />
        : <KostenCharts rows={topRows} />
      }
      <KostenTabel rows={rows} totaal={totaal} />
    </div>
  );
}

// ── Gedeelde grafiek-componenten ──────────────────────────────────────────────

function KostenCharts({ rows }: { rows: { name: string; value: number }[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="text-sm">Verdeling (top {rows.length})</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={rows} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={2}>
                {rows.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-1">
            {rows.map((d, i) => {
              const tot = rows.reduce((s, x) => s + x.value, 0);
              return (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-muted-foreground truncate max-w-[160px]">{d.name}</span>
                  </span>
                  <span className="tabular-nums font-medium ml-2 shrink-0">{(tot > 0 ? d.value / tot * 100 : 0).toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Bedrag per categorie</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={rows} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={115} />
              <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} cursor={{ fill: "transparent" }} />
              <Bar dataKey="value" name="Bedrag" radius={[0, 4, 4, 0]}>
                {rows.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function KostenTabel({ rows, totaal }: { rows: { KOSTENSOORT: string; BEDRAG: number; PCT: number }[]; totaal: number }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Detail per categorie</CardTitle></CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Categorie</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Bedrag</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">% van totaal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.KOSTENSOORT + i} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2.5 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {r.KOSTENSOORT}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatCurrency(r.BEDRAG)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{r.PCT.toFixed(1)}%</td>
              </tr>
            ))}
            <tr className="border-t bg-muted/20 font-semibold">
              <td className="px-4 py-2.5">Totaal</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(totaal)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">100%</td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function KostenPage() {
  const role     = useRole();
  const viewType = useViewTypeSafe();
  const activeDb = useActiveDb();

  if (role === "MGM") return <ManagementKostenPage />;
  if (viewType === "CUSTOMER") return <MaintenanceKostenPage />;
  return <ProjectKostenPage activeDb={activeDb} />;
}

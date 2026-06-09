"use client";

import { useQuery } from "@tanstack/react-query";
import { useViewTypeSafe } from "@/hooks/use-view-type-safe";
import { useActiveDb } from "@/hooks/use-active-db";
import { useRole } from "@/hooks/use-role";
import { formatPercentage } from "@/lib/format";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { WeekStats, MaandStats, MaintenanceKlant } from "@/lib/mock/maintenance-data";
import type { ElmarProjectSummary } from "@/lib/mock/elmar-data";

// ── Type B (maintenance) ──────────────────────────────────────────────────────

function MaintenanceOmzetPage() {
  // klantId verwijderd — klantfilter volgt later na per-klant omzet-API
  const klantId = "all";

  // klantfilter tijdelijk uitgeschakeld — API-klanten zijn locaties zonder omzet-split
  const klanten: never[] = [];

  const { data: weekData, isLoading: weekLoading } = useQuery<WeekStats[]>({
    queryKey: ["maintenance", "omzet", "week", klantId],
    queryFn:  () => fetch(`/api/v1/maintenance/omzet?periode=week&n=12${klantId !== "all" ? `&klantId=${klantId}` : ""}`).then(r => r.json()),
  });

  const { data: maandData, isLoading: maandLoading } = useQuery<MaandStats[]>({
    queryKey: ["maintenance", "omzet", "maand", klantId],
    queryFn:  () => fetch(`/api/v1/maintenance/omzet?periode=maand&n=12${klantId !== "all" ? `&klantId=${klantId}` : ""}`).then(r => r.json()),
  });

  // Guard tegen NaN (SUM kan null retourneren als geen records matchen)
  const safeNum = (v: unknown) => (isFinite(Number(v)) ? Number(v) : 0);
  const weekTotaal  = (weekData ?? []).reduce((s, w) => s + safeNum(w.omzet), 0);
  const maandTotaal = (maandData ?? []).reduce((s, m) => s + safeNum(m.omzet), 0);
  const huidigWeek  = weekData?.[weekData.length - 1];
  const huidigMaand = maandData?.[maandData.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Omzet</h1>
          <p className="text-sm text-muted-foreground mt-1">Maintenance — week & maand overzicht</p>
        </div>
        {/* Klantfilter — volgt na per-klant API-uitbreiding */}
        <span className="text-xs text-muted-foreground">Alle klanten</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Vorige week",       value: formatCurrency(safeNum(huidigWeek?.omzet)) },
          { label: "Vorige maand",      value: formatCurrency(safeNum(huidigMaand?.omzet)) },
          { label: "12 weken totaal",  value: formatCurrency(weekTotaal) },
          { label: "12 maanden totaal", value: formatCurrency(maandTotaal) },
        ].map(c => (
          <Card key={c.label}>
            <CardHeader><CardTitle className="text-xs text-muted-foreground">{c.label}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold tabular-nums">{c.value}</p></CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="week">
        <TabsList>
          <TabsTrigger value="week">Per week</TabsTrigger>
          <TabsTrigger value="maand">Per maand</TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Omzet per week (laatste 12 weken)</CardTitle></CardHeader>
            <CardContent>
              {weekLoading ? <div className="h-64 animate-pulse bg-muted rounded" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={weekData ?? []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="omzet" name="Omzet" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Werkbonnen per week</CardTitle></CardHeader>
            <CardContent>
              {weekLoading ? <div className="h-64 animate-pulse bg-muted rounded" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={weekData ?? []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Legend />
                    <Bar dataKey="uitgevoerd" name="Uitgevoerd" stackId="a" fill="#10b981" />
                    <Bar dataKey="openstaand" name="Openstaand" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="aangemaakt" name="Aangemaakt" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maand" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Omzet per maand (laatste 12 maanden)</CardTitle></CardHeader>
            <CardContent>
              {maandLoading ? <div className="h-64 animate-pulse bg-muted rounded" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={maandData ?? []}>
                    <defs>
                      <linearGradient id="omzetGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                    <Area dataKey="omzet" name="Omzet" stroke="#2563eb" fill="url(#omzetGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Detail per maand</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Maand</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Omzet</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Uitgevoerd</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Openstaand</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Totaal bons</th>
                  </tr>
                </thead>
                <tbody>
                  {[...(maandData ?? [])].reverse().map((m, i) => (
                    <tr key={`${m.jaar}-${m.maand}`} className={`border-b last:border-0 hover:bg-muted/30 ${i % 2 === 1 ? "bg-muted/10" : ""}`}>
                      <td className="px-4 py-2 font-medium">{m.label}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-semibold">{formatCurrency(m.omzet)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{m.uitgevoerd}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-orange-600">{m.openstaand}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{m.totaal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Type A (project) ──────────────────────────────────────────────────────────

interface PeriodeData {
  periodeLabel: string;
  totaalGefactureerd: number;
  projecten: { PROJECTNUMMER: string; NAAM: string; KLANT: string; AANNEEMSOM: number; GEFACTUREERD_PERIODE: number }[];
}

const huidigJaar = new Date().getFullYear();
const JAAR_OPTIES = [
  { value: `jaar-${huidigJaar}`,   label: `${huidigJaar} YTD` },
  { value: `jaar-${huidigJaar-1}`, label: String(huidigJaar - 1) },
  { value: "alletijd",             label: "Alle jaren" },
];

function ProjectOmzetPage({ activeDb }: { activeDb: string }) {
  const [periodeMode, setPeriodeMode] = useState(`jaar-${huidigJaar}`);

  const apiParams = (() => {
    if (periodeMode === "alletijd") return `mode=alletijd`;
    const jaar = parseInt(periodeMode.replace("jaar-", ""));
    return `mode=jaar&jaar=${jaar}`;
  })();

  const { data, isLoading } = useQuery<PeriodeData>({
    queryKey: ["omzet-periode", activeDb, periodeMode],
    queryFn:  () => fetch(`/api/v1/omzet-periode?database=${activeDb}&${apiParams}`).then(r => r.json()),
  });

  const projecten    = data?.projecten ?? [];
  const totaalOmzet  = data?.totaalGefactureerd ?? 0;
  const totaalAannem = projecten.reduce((s, p) => s + p.AANNEEMSOM, 0);
  const pctFact      = totaalAannem > 0 ? (totaalOmzet / totaalAannem) * 100 : 0;
  const periodeLabel = data?.periodeLabel ?? "—";

  const chartData = [...projecten]
    .sort((a, b) => b.GEFACTUREERD_PERIODE - a.GEFACTUREERD_PERIODE)
    .slice(0, 30)
    .map(p => ({ naam: p.PROJECTNUMMER, gefactureerd: p.GEFACTUREERD_PERIODE, aanneemsom: p.AANNEEMSOM }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Omzet</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gefactureerde omzet per project — {activeDb}
            <span className="ml-2 inline-flex items-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 text-xs font-semibold">
              {periodeLabel}
            </span>
          </p>
        </div>
        <Select value={periodeMode} onValueChange={(v) => { if (v) setPeriodeMode(v); }}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {JAAR_OPTIES.map(o => (
              <SelectItem key={o.value} value={o.value} className="text-sm">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-xs text-muted-foreground">Gefactureerd — {periodeLabel}</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold tabular-nums text-blue-600 dark:text-blue-400">{formatCurrency(totaalOmzet)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xs text-muted-foreground">Aanneemsom (all-time)</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold tabular-nums">{formatCurrency(totaalAannem)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xs text-muted-foreground">% Gefactureerd vs aanneemsom</CardTitle></CardHeader>
          <CardContent><p className={`text-3xl font-bold tabular-nums ${pctFact >= 80 ? "text-emerald-600 dark:text-emerald-400" : pctFact >= 50 ? "text-orange-600" : "text-red-600"}`}>
            {totaalAannem > 0 ? `${pctFact.toFixed(1)}%` : "n.v.t."}
          </p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Top 30 projecten op omzet — {periodeLabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="h-72 animate-pulse bg-muted rounded" /> : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="naam" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} cursor={{ fill: 'transparent' }} />
                <Legend />
                <Bar dataKey="aanneemsom"   name="Aanneemsom (all-time)" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gefactureerd" name={`Gefactureerd ${periodeLabel}`} fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Detail per project — {periodeLabel}
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              ({projecten.length} projecten met omzet in deze periode)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Project</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Naam</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Aanneemsom</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Gefactureerd {periodeLabel}</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">% Fact.</th>
                </tr>
              </thead>
              <tbody>
                {projecten.map((p, i) => {
                  const pct = p.AANNEEMSOM > 0 ? (p.GEFACTUREERD_PERIODE / p.AANNEEMSOM) * 100 : null;
                  return (
                    <tr key={p.PROJECTNUMMER} className={`border-b last:border-0 hover:bg-muted/30 ${i % 2 === 1 ? "bg-muted/10" : ""}`}>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{p.PROJECTNUMMER}</td>
                      <td className="px-4 py-2.5 font-medium max-w-[200px] truncate">{p.NAAM}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(p.AANNEEMSOM)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(p.GEFACTUREERD_PERIODE)}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums ${pct == null ? "text-muted-foreground" : pct >= 80 ? "text-emerald-600 dark:text-emerald-400" : pct >= 50 ? "text-orange-600" : "text-red-600"}`}>
                        {pct != null ? `${pct.toFixed(1)}%` : "n.v.t."}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Management Omzet view (MGM rol) ──────────────────────────────────────────

interface DbStats {
  database: string; label: string; source: string;
  aanneemsom: number; gefactureerd: number; nogTeFactureren: number;
  brutomarge: number; margePct: number; actief: number; totaal: number;
}
interface SamenvattingResponse { perDatabase: DbStats[]; totaal: DbStats & { margePct: number } }

const DB_COLORS_CHART: Record<string, string> = {
  SERVICES: "#3b82f6", MAINTENANCE: "#8b5cf6", INTERNATIONAL: "#10b981", KEYSER: "#f59e0b",
};

function ManagementOmzetPage() {
  const { data, isLoading } = useQuery<SamenvattingResponse>({
    queryKey: ["mgm-samenvatting"],
    queryFn: () => fetch("/api/v1/management/samenvatting?status=alle").then(r => r.json()),
    staleTime: 60_000,
  });

  const dbs = (data?.perDatabase ?? []).filter(d => d.source !== "not-connected");
  const t   = data?.totaal;

  const barData = dbs.map(d => ({
    name:           d.label,
    Aanneemsom:     d.aanneemsom,
    Gefactureerd:   d.gefactureerd,
    "Nog te fact.": d.aanneemsom - d.gefactureerd,
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Omzet — Management</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold">Omzet — Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Geconsolideerd omzetoverzicht over alle bedrijven</p>
      </div>

      {t && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Totale aanneemsom",   value: formatCurrency(t.aanneemsom),   color: "text-blue-600" },
            { label: "Totaal gefactureerd", value: formatCurrency(t.gefactureerd), color: "text-emerald-600" },
            { label: "Nog te factureren",   value: formatCurrency(t.aanneemsom - t.gefactureerd), color: t.aanneemsom > t.gefactureerd ? "text-orange-600" : "text-muted-foreground" },
            { label: "Gem. marge %",        value: formatPercentage(t.gefactureerd > 0 ? t.brutomarge / t.gefactureerd * 100 : 0), color: t.brutomarge >= 0 ? "text-emerald-600" : "text-red-600" },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">{label}</span>
                <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Aanneemsom vs Gefactureerd per bedrijf</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `€${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 11 }} width={52} />
              <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Aanneemsom"     fill="#3b82f6" fillOpacity={0.4} radius={[4,4,0,0]} />
              <Bar dataKey="Gefactureerd"   fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="Nog te fact."   fill="#f59e0b" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Detail per bedrijf</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {["Bedrijf", "Projecten", "Aanneemsom", "Gefactureerd", "Nog te fact.", "Brutomarge", "Marge %"].map((h, i) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dbs.map(d => {
                  const nogTeFact = d.aanneemsom - d.gefactureerd;
                  const margePct  = d.gefactureerd > 0 ? d.brutomarge / d.gefactureerd * 100 : 0;
                  return (
                    <tr key={d.database} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: DB_COLORS_CHART[d.database] ?? "#64748b" }} />
                          <span className="font-medium">{d.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{d.actief} actief / {d.totaal}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatCurrency(d.aanneemsom)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(d.gefactureerd)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${nogTeFact > 0 ? "text-orange-600 font-medium" : "text-muted-foreground"}`}>{formatCurrency(nogTeFact)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums font-semibold ${d.brutomarge >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(d.brutomarge)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${margePct >= 15 ? "text-emerald-600 font-semibold" : margePct < 0 ? "text-red-600 font-semibold" : ""}`}>{formatPercentage(margePct)}</td>
                    </tr>
                  );
                })}
                {t && (() => {
                  const nogTeFact = t.aanneemsom - t.gefactureerd;
                  const margePct  = t.gefactureerd > 0 ? t.brutomarge / t.gefactureerd * 100 : 0;
                  return (
                    <tr className="border-t-2 bg-muted/30 font-semibold">
                      <td className="px-4 py-3 text-muted-foreground" colSpan={2}>Totaal</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(t.aanneemsom)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(t.gefactureerd)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${nogTeFact > 0 ? "text-orange-600" : ""}`}>{formatCurrency(nogTeFact)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${t.brutomarge >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(t.brutomarge)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${margePct >= 15 ? "text-emerald-600" : margePct < 0 ? "text-red-600" : ""}`}>{formatPercentage(margePct)}</td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function OmzetPage() {
  const role     = useRole();
  const viewType = useViewTypeSafe();
  const activeDb = useActiveDb();
  if (role === "MGM") return <ManagementOmzetPage />;
  return viewType === "CUSTOMER" ? <MaintenanceOmzetPage /> : <ProjectOmzetPage activeDb={activeDb} />;
}

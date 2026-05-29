"use client";

import { useQuery } from "@tanstack/react-query";
import { useViewTypeSafe } from "@/hooks/use-view-type-safe";
import { useActiveDb } from "@/hooks/use-active-db";
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
  const [klantId, setKlantId]   = useState<string>("all");

  const { data: klanten } = useQuery<(MaintenanceKlant & { summary: unknown })[]>({
    queryKey: ["maintenance", "klanten"],
    queryFn:  () => fetch("/api/v1/maintenance/klanten").then(r => r.json()),
    staleTime: 300_000,
  });

  const { data: weekData, isLoading: weekLoading } = useQuery<WeekStats[]>({
    queryKey: ["maintenance", "omzet", "week", klantId],
    queryFn:  () => fetch(`/api/v1/maintenance/omzet?periode=week&n=12${klantId !== "all" ? `&klantId=${klantId}` : ""}`).then(r => r.json()),
  });

  const { data: maandData, isLoading: maandLoading } = useQuery<MaandStats[]>({
    queryKey: ["maintenance", "omzet", "maand", klantId],
    queryFn:  () => fetch(`/api/v1/maintenance/omzet?periode=maand&n=12${klantId !== "all" ? `&klantId=${klantId}` : ""}`).then(r => r.json()),
  });

  const weekTotaal  = (weekData ?? []).reduce((s, w) => s + w.omzet, 0);
  const maandTotaal = (maandData ?? []).reduce((s, m) => s + m.omzet, 0);
  const huidigWeek  = weekData?.[weekData.length - 1];
  const huidigMaand = maandData?.[maandData.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Omzet</h1>
          <p className="text-sm text-muted-foreground mt-1">Maintenance — week & maand overzicht</p>
        </div>
        <Select value={klantId} onValueChange={(v) => setKlantId(v ?? "all")}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Alle klanten" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle klanten</SelectItem>
            {(klanten ?? []).map(k => <SelectItem key={k.id} value={k.id}>{k.naam}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Deze week",    value: formatCurrency(huidigWeek?.omzet  ?? 0) },
          { label: "Deze maand",   value: formatCurrency(huidigMaand?.omzet ?? 0) },
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

function ProjectOmzetPage({ activeDb }: { activeDb: string }) {
  const { data, isLoading } = useQuery<{ data: ElmarProjectSummary[] }>({
    queryKey: ["projecten", activeDb, "omzet"],
    queryFn:  () => fetch(`/api/v1/projecten?database=${activeDb}&pageSize=100`).then(r => r.json()),
  });

  const projecten    = data?.data ?? [];
  const totaalOmzet  = projecten.reduce((s, p) => s + p.GEFACTUREERD_TOTAAL, 0);
  const totaalAannem = projecten.reduce((s, p) => s + p.TOTAAL_AANNEEMSOM, 0);
  const pctFact      = totaalAannem > 0 ? (totaalOmzet / totaalAannem) * 100 : 0;

  const chartData = [...projecten]
    .sort((a, b) => b.GEFACTUREERD_TOTAAL - a.GEFACTUREERD_TOTAAL)
    .map(p => ({ naam: p.PROJECTNUMMER, gefactureerd: p.GEFACTUREERD_TOTAAL, aanneemsom: p.TOTAAL_AANNEEMSOM }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Omzet</h1>
        <p className="text-sm text-muted-foreground mt-1">Gefactureerde omzet per project — {activeDb}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-xs text-muted-foreground">Totaal gefactureerd</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold tabular-nums text-blue-600 dark:text-blue-400">{formatCurrency(totaalOmzet)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xs text-muted-foreground">Totale aanneemsom</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold tabular-nums">{formatCurrency(totaalAannem)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xs text-muted-foreground">% Gefactureerd</CardTitle></CardHeader>
          <CardContent><p className={`text-3xl font-bold tabular-nums ${pctFact >= 80 ? "text-emerald-600 dark:text-emerald-400" : pctFact >= 50 ? "text-orange-600" : "text-red-600"}`}>{pctFact.toFixed(1)}%</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Gefactureerd vs Aanneemsom per project</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="h-72 animate-pulse bg-muted rounded" /> : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="naam" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} cursor={{ fill: 'transparent' }} />
                <Legend />
                <Bar dataKey="aanneemsom"   name="Aanneemsom"   fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gefactureerd" name="Gefactureerd" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Detail per project</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Project</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Naam</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Aanneemsom</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Gefactureerd</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">% Fact.</th>
                </tr>
              </thead>
              <tbody>
                {[...projecten].sort((a, b) => b.GEFACTUREERD_TOTAAL - a.GEFACTUREERD_TOTAAL).map((p, i) => {
                  const pct = p.TOTAAL_AANNEEMSOM > 0 ? (p.GEFACTUREERD_TOTAAL / p.TOTAAL_AANNEEMSOM) * 100 : 0;
                  return (
                    <tr key={p.ID} className={`border-b last:border-0 hover:bg-muted/30 ${i % 2 === 1 ? "bg-muted/10" : ""}`}>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{p.PROJECTNUMMER}</td>
                      <td className="px-4 py-2.5 font-medium max-w-[200px] truncate">{p.NAAM}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(p.TOTAAL_AANNEEMSOM)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(p.GEFACTUREERD_TOTAAL)}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums ${pct >= 80 ? "text-emerald-600 dark:text-emerald-400" : pct >= 50 ? "text-orange-600" : "text-red-600"}`}>{pct.toFixed(1)}%</td>
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

// ── Root ──────────────────────────────────────────────────────────────────────

export default function OmzetPage() {
  const viewType = useViewTypeSafe();
  const activeDb = useActiveDb();
  return viewType === "CUSTOMER" ? <MaintenanceOmzetPage /> : <ProjectOmzetPage activeDb={activeDb} />;
}

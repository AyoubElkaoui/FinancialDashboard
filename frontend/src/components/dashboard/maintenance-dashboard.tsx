"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  Wrench, Building2, TrendingUp, CheckCircle2, AlertCircle, ArrowRight,
} from "lucide-react";
import type { MaintenanceKlant, WeekStats, MaandStats } from "@/lib/mock/maintenance-data";

export const MAINT_PREFS_KEY = "elmar_maint_dashboard_prefs";
export const MAINT_WIDGETS = [
  { id: "maint-kpi",           label: "KPI overzicht",         description: "Klanten, omzet week/maand, werkbon aantallen" },
  { id: "maint-omzet-week",    label: "Omzet per week",        description: "Staafdiagram — laatste 8 weken" },
  { id: "maint-werkbon-status",label: "Werkbon status",        description: "Gestapeld staafdiagram — laatste 6 maanden" },
  { id: "maint-klanten-tabel", label: "Klanten overzicht",     description: "Week & maand totalen per klant" },
];

function useShow() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  useEffect(() => {
    function read() {
      try {
        const raw = localStorage.getItem(MAINT_PREFS_KEY);
        if (raw) setPrefs(JSON.parse(raw) as Record<string, boolean>);
        else setPrefs(Object.fromEntries(MAINT_WIDGETS.map(w => [w.id, true])));
      } catch {}
    }
    read();
    window.addEventListener("elmar-prefs-change", read);
    return () => window.removeEventListener("elmar-prefs-change", read);
  }, []);
  return (id: string) => prefs[id] !== false;
}

interface KlantWithSummary extends MaintenanceKlant {
  summary: {
    week:  { omzet: number; totaal: number; uitgevoerd: number; openstaand: number };
    maand: { omzet: number; totaal: number; uitgevoerd: number; openstaand: number };
    jaar:  { omzet: number; totaal: number; uitgevoerd: number; openstaand: number };
  };
}

export function MaintenanceDashboard() {
  const router = useRouter();
  const show   = useShow();

  const { data: klanten, isLoading: klantenLoading } = useQuery<KlantWithSummary[]>({
    queryKey: ["maintenance", "klanten"],
    queryFn:  () => fetch("/api/v1/maintenance/klanten").then(r => r.json()),
    staleTime: 120_000,
  });

  const { data: weekStats } = useQuery<WeekStats[]>({
    queryKey: ["maintenance", "omzet", "week", "all"],
    queryFn:  () => fetch("/api/v1/maintenance/omzet?periode=week&n=8").then(r => r.json()),
    staleTime: 120_000,
  });

  const { data: maandStats } = useQuery<MaandStats[]>({
    queryKey: ["maintenance", "omzet", "maand", "all"],
    queryFn:  () => fetch("/api/v1/maintenance/omzet?periode=maand&n=6").then(r => r.json()),
    staleTime: 120_000,
  });

  const allKlanten = klanten ?? [];

  const totaalWeekOmzet  = allKlanten.reduce((s, k) => s + k.summary.week.omzet,  0);
  const totaalMaandOmzet = allKlanten.reduce((s, k) => s + k.summary.maand.omzet, 0);
  const totaalWeekBons   = allKlanten.reduce((s, k) => s + k.summary.week.totaal,  0);
  const totaalMaandBons  = allKlanten.reduce((s, k) => s + k.summary.maand.totaal, 0);
  const openstaandTotaal = allKlanten.reduce((s, k) => s + k.summary.maand.openstaand, 0);
  const uitgevoerdTotaal = allKlanten.reduce((s, k) => s + k.summary.maand.uitgevoerd, 0);

  const huidigWeek  = (weekStats  ?? []).at(-1);
  const huidigMaand = (maandStats ?? []).at(-1);

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Badge variant="outline" className="gap-2 text-xs py-1 font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
          </span>
          Maintenance
        </Badge>
      </div>

      {/* KPI kaarten */}
      {show("maint-kpi") && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Klanten"            value={String(allKlanten.length)}                                      icon={Building2}    color="blue"   />
          <StatCard label="Omzet deze week"    value={formatCurrency(huidigWeek?.omzet  ?? totaalWeekOmzet)}          icon={TrendingUp}   color="green"  />
          <StatCard label="Omzet deze maand"   value={formatCurrency(huidigMaand?.omzet ?? totaalMaandOmzet)}         icon={TrendingUp}   color="blue"   />
          <StatCard label="Bons deze week"     value={String(huidigWeek?.totaal  ?? totaalWeekBons)}                  icon={Wrench}       color="slate"  />
          <StatCard label="Uitgevoerd (maand)" value={String(huidigMaand?.uitgevoerd ?? uitgevoerdTotaal)}            icon={CheckCircle2} color="green"  />
          <StatCard label="Openstaand (maand)" value={String(huidigMaand?.openstaand ?? openstaandTotaal)}            icon={AlertCircle}  color="orange" />
        </div>
      )}

      {/* Grafieken */}
      {(show("maint-omzet-week") || show("maint-werkbon-status")) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {show("maint-omzet-week") && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Omzet per week</CardTitle>
                <p className="text-xs text-muted-foreground">Laatste 8 weken</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={weekStats ?? []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={42} />
                    <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="omzet" name="Omzet" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {show("maint-werkbon-status") && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Werkbon status</CardTitle>
                <p className="text-xs text-muted-foreground">Laatste 6 maanden</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={maandStats ?? []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="uitgevoerd" name="Uitgevoerd" stackId="a" fill="#10b981" />
                    <Bar dataKey="openstaand" name="Openstaand" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="aangemaakt"  name="Aangemaakt" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Klanten tabel */}
      {show("maint-klanten-tabel") && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Klanten overzicht</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Week & maand totalen — klik voor detail</p>
              </div>
              <button
                onClick={() => router.push("/klanten")}
                className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
              >
                Alle klanten <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {klantenLoading ? (
              <div className="p-4 space-y-2">
                {[1,2,3,4,5].map(i => <div key={i} className="h-9 bg-muted animate-pulse rounded" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Klant</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground border-l">Omzet week</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Bons</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Open</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground border-l">Omzet maand</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Bons</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allKlanten.map((k, i) => (
                      <tr
                        key={k.id}
                        className={`border-b last:border-0 cursor-pointer hover:bg-muted/40 transition-colors ${i % 2 === 1 ? "bg-muted/10" : ""}`}
                        onClick={() => router.push(`/klanten/${k.id}`)}
                      >
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-sm">{k.naam}</p>
                          <p className="text-[11px] text-muted-foreground">{k.variant}</p>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold border-l">{formatCurrency(k.summary.week.omzet)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{k.summary.week.totaal}</td>
                        <td className={`px-3 py-2.5 text-right tabular-nums ${k.summary.week.openstaand > 0 ? "text-orange-600 font-medium" : "text-muted-foreground"}`}>
                          {k.summary.week.openstaand}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold border-l">{formatCurrency(k.summary.maand.omzet)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{k.summary.maand.totaal}</td>
                        <td className={`px-3 py-2.5 text-right tabular-nums ${k.summary.maand.openstaand > 0 ? "text-orange-600 font-medium" : "text-muted-foreground"}`}>
                          {k.summary.maand.openstaand}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/30 font-semibold">
                      <td className="px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Totaal</td>
                      <td className="px-3 py-2.5 text-right tabular-nums border-l">{formatCurrency(totaalWeekOmzet)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{totaalWeekBons}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-orange-600">{allKlanten.reduce((s, k) => s + k.summary.week.openstaand, 0)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums border-l">{formatCurrency(totaalMaandOmzet)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{totaalMaandBons}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-orange-600">{allKlanten.reduce((s, k) => s + k.summary.maand.openstaand, 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

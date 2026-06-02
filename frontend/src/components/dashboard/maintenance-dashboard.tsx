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
  Wrench, Building2, TrendingUp, CheckCircle2, AlertCircle, ArrowRight, RefreshCw,
} from "lucide-react";

export const MAINT_PREFS_KEY = "elmar_maint_dashboard_prefs";
export const MAINT_WIDGETS = [
  { id: "maint-kpi",           label: "KPI overzicht",         description: "Klanten, omzet week/maand, werkbon aantallen" },
  { id: "maint-omzet-week",    label: "Omzet per maand",       description: "Staafdiagram — laatste 12 maanden" },
  { id: "maint-werkbon-status",label: "Werkbon status",        description: "Gestapeld staafdiagram — laatste 8 weken" },
  { id: "maint-klanten-tabel", label: "Klanten overzicht",     description: "Week & maand tellingen per klant" },
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stats {
  periode: { week: string; maand: string; jaar: string; maandLabel: string };
  werkbonnen: { totaal: number; openstaand: number; uitgevoerd: number; weekBons: number; maandBons: number };
  omzet: { week: number; maand: number; jaar: number; vorigeMaand: number };
  topKlanten: { klant: string; aantalBons: number }[];
}

interface MaandRow  { label: string; jaar: number; maand: number; omzet: number }
interface WeekRow   { label: string; aangemaakt: number; uitgevoerd: number; openstaand: number }

interface KlantRow {
  klant: string;
  totaalBons: number;
  week:  { openstaand: number; uitgevoerd: number; totaal: number };
  maand: { openstaand: number; uitgevoerd: number; totaal: number };
  jaar:  { openstaand: number; uitgevoerd: number; totaal: number };
}

// ── Dashboard component ───────────────────────────────────────────────────────

export function MaintenanceDashboard() {
  const router = useRouter();
  const show   = useShow();

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["maintenance", "stats"],
    queryFn:  () => fetch("/api/v1/maintenance/stats?database=MAINTENANCE").then(r => r.json()),
    staleTime: 60_000,
  });

  const { data: maandData } = useQuery<MaandRow[]>({
    queryKey: ["maintenance", "omzet", "maand"],
    queryFn:  () => fetch("/api/v1/maintenance/omzet?periode=maand&database=MAINTENANCE").then(r => r.json()),
    staleTime: 60_000,
  });

  const { data: weekData } = useQuery<WeekRow[]>({
    queryKey: ["maintenance", "omzet", "week"],
    queryFn:  () => fetch("/api/v1/maintenance/omzet?periode=week&database=MAINTENANCE").then(r => r.json()),
    staleTime: 60_000,
  });

  const { data: klanten } = useQuery<KlantRow[]>({
    queryKey: ["maintenance", "klanten"],
    queryFn:  () => fetch("/api/v1/maintenance/klanten?database=MAINTENANCE").then(r => r.json()),
    staleTime: 120_000,
  });

  const syncBadge = stats
    ? `${stats.periode.maandLabel}`
    : "Laden…";

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("nl-NL", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 text-xs py-1 font-medium text-muted-foreground">
            <RefreshCw className="h-3 w-3" />{syncBadge}
          </Badge>
          <Badge variant="outline" className="gap-2 text-xs py-1 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
            </span>
            Maintenance
          </Badge>
        </div>
      </div>

      {/* KPI kaarten */}
      {show("maint-kpi") && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            label="Openstaand"
            value={statsLoading ? "—" : String(stats?.werkbonnen.openstaand ?? 0)}
            sub="werkbonnen (A+I)"
            icon={AlertCircle} color="orange"
          />
          <StatCard
            label="Uitgevoerd"
            value={statsLoading ? "—" : String(stats?.werkbonnen.uitgevoerd ?? 0)}
            sub="werkbonnen (U+V)"
            icon={CheckCircle2} color="green"
          />
          <StatCard
            label="Bons deze week"
            value={statsLoading ? "—" : String(stats?.werkbonnen.weekBons ?? 0)}
            sub="geboekt op boekdatum"
            icon={Wrench} color="slate"
          />
          <StatCard
            label="Bons deze maand"
            value={statsLoading ? "—" : String(stats?.werkbonnen.maandBons ?? 0)}
            sub={stats?.periode.maandLabel ?? ""}
            icon={Wrench} color="blue"
          />
          <StatCard
            label="Omzet deze week"
            value={statsLoading ? "—" : formatCurrency(stats?.omzet.week ?? 0)}
            sub="journaal 8xxx credit"
            icon={TrendingUp} color="green"
          />
          <StatCard
            label="Omzet deze maand"
            value={statsLoading ? "—" : formatCurrency(stats?.omzet.maand ?? 0)}
            sub={stats?.periode.maandLabel ?? ""}
            icon={TrendingUp} color="blue"
          />
        </div>
      )}

      {/* Grafieken */}
      {(show("maint-omzet-week") || show("maint-werkbon-status")) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {show("maint-omzet-week") && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Omzet per maand</CardTitle>
                <p className="text-xs text-muted-foreground">Laatste 12 maanden — journaal boekdatum</p>
              </CardHeader>
              <CardContent>
                {!maandData ? <div className="h-56 animate-pulse bg-muted rounded" /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={maandData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={44} />
                      <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} cursor={{ fill: "transparent" }} />
                      <Bar dataKey="omzet" name="Omzet" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}

          {show("maint-werkbon-status") && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Werkbon status per week</CardTitle>
                <p className="text-xs text-muted-foreground">Laatste 8 weken — geboekt op boekdatum</p>
              </CardHeader>
              <CardContent>
                {!weekData ? <div className="h-56 animate-pulse bg-muted rounded" /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={weekData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip cursor={{ fill: "transparent" }} />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="uitgevoerd" name="Uitgevoerd" stackId="a" fill="#10b981" />
                      <Bar dataKey="openstaand" name="Openstaand" stackId="a" fill="#f59e0b" />
                      <Bar dataKey="aangemaakt"  name="Aangemaakt" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
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
                <p className="text-xs text-muted-foreground mt-0.5">
                  Week / maand / jaar tellingen op boekdatum
                </p>
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
            {!klanten ? <div className="h-40 animate-pulse bg-muted rounded m-4" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 border-b">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Klant</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Week O</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Week U</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Maand O</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Maand U</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Jaar totaal</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Totaal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {klanten.slice(0, 20).map((k, i) => (
                      <tr key={k.klant} className={`border-b last:border-0 hover:bg-muted/30 ${i % 2 === 1 ? "bg-muted/10" : ""}`}>
                        <td className="px-4 py-2 font-medium text-xs truncate max-w-[200px]" title={k.klant}>{k.klant}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs">
                          <span className={k.week.openstaand > 0 ? "text-orange-600 font-semibold" : "text-muted-foreground"}>{k.week.openstaand}</span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs">
                          <span className={k.week.uitgevoerd > 0 ? "text-emerald-600" : "text-muted-foreground"}>{k.week.uitgevoerd}</span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs">
                          <span className={k.maand.openstaand > 0 ? "text-orange-600 font-semibold" : "text-muted-foreground"}>{k.maand.openstaand}</span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs">
                          <span className={k.maand.uitgevoerd > 0 ? "text-emerald-600" : "text-muted-foreground"}>{k.maand.uitgevoerd}</span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs text-muted-foreground">{k.jaar.totaal}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-xs font-semibold">{k.totaalBons}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* YTD omzet overzicht */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Omzet YTD", value: formatCurrency(stats.omzet.jaar), sub: String(new Date().getFullYear()), color: "text-violet-600 dark:text-violet-400" },
            { label: "Omzet vorige maand", value: formatCurrency(stats.omzet.vorigeMaand), sub: "kalendermaand", color: "text-blue-600 dark:text-blue-400" },
            { label: "Totaal werkbonnen", value: String(stats.werkbonnen.totaal), sub: "all-time in systeem", color: "" },
            { label: "Openstaand %", value: stats.werkbonnen.totaal > 0 ? `${((stats.werkbonnen.openstaand / stats.werkbonnen.totaal) * 100).toFixed(1)}%` : "—", sub: "van totaal", color: stats.werkbonnen.openstaand / (stats.werkbonnen.totaal || 1) > 0.1 ? "text-orange-600" : "text-emerald-600" },
          ].map(item => (
            <Card key={item.label}>
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                <p className={`text-xl font-bold tabular-nums mt-1 ${item.color}`}>{item.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

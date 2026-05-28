"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { dashboardApi, facturenApi, inkoopApi } from "@/lib/api-client";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import { CHART_COLORS, getChartColor } from "@/lib/chart-colors";
import {
  TrendingUp, FolderKanban, ClipboardList,
  AlertCircle, Euro, ArrowRight, CheckCircle2,
  Users, Clock, Activity,
} from "lucide-react";
import { useActiveDb } from "@/hooks/use-active-db";
import { useViewTypeSafe } from "@/hooks/use-view-type-safe";
import { useEffect, useState } from "react";
import { MaintenanceDashboard } from "@/components/dashboard/maintenance-dashboard";

const PREFS_KEY = "elmar_dashboard_prefs";
const ALL_WIDGETS = [
  "financieel","uren","omzet-grafiek","inkoop-grafiek","uren-dag",
  "uren-medewerker","top-klanten","aging","uren-project","recente-uren",
  "werkbonnen","open-facturen",
];

function useWidgetPrefs() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(ALL_WIDGETS.map(w => [w, true]))
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) setPrefs(JSON.parse(raw) as Record<string, boolean>);
    } catch {}
  }, []);

  useEffect(() => {
    function reread() {
      try {
        const raw = localStorage.getItem(PREFS_KEY);
        if (raw) setPrefs(JSON.parse(raw) as Record<string, boolean>);
        else setPrefs(Object.fromEntries(ALL_WIDGETS.map(w => [w, true])));
      } catch {}
    }
    window.addEventListener("storage", reread);
    window.addEventListener("focus", reread);
    window.addEventListener("elmar-prefs-change", reread);
    return () => {
      window.removeEventListener("storage", reread);
      window.removeEventListener("focus", reread);
      window.removeEventListener("elmar-prefs-change", reread);
    };
  }, []);

  return (id: string) => prefs[id] !== false;
}

const MAANDEN = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];

const AGING_COLORS: Record<string, string> = {
  current:"#10b981","1-30":"#84cc16","31-60":"#f59e0b","61-90":"#f97316","90+":"#ef4444",
};
const AGING_LABELS: Record<string, string> = {
  current:"Niet vervallen","1-30":"1–30 dagen","31-60":"31–60 dagen","61-90":"61–90 dagen","90+":"90+ dagen",
};

type Num = number | null | undefined;
function n(v: unknown): number { return Number(v ?? 0); }

function EuroTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover p-3 shadow-lg text-sm min-w-[160px]">
      <p className="font-semibold mb-1.5 text-foreground">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </span>
          <span className="font-medium tabular-nums">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function UrenTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover p-2.5 shadow-lg text-sm">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground">{formatNumber(payload[0].value, 1)} <span className="font-semibold text-foreground">uur</span></p>
    </div>
  );
}

function SectionHeader({ title, description, href, router }: { title: string; description?: string; href?: string; router?: ReturnType<typeof useRouter> }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {href && router && (
        <button onClick={() => router.push(href)} className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
          Alle zien <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const viewType = useViewTypeSafe();
  return viewType === "CUSTOMER" ? <MaintenanceDashboard /> : <ProjectDashboard />;
}

function ProjectDashboard() {
  const router    = useRouter();
  const activeDb  = useActiveDb();
  const { refetchInterval } = useAutoRefresh();
  const opts = { refetchInterval };
  const show = useWidgetPrefs();

  const { data: kpis,      isLoading: kpisLoading }  = useQuery({ queryKey: ["dashboard","kpis",               activeDb], queryFn: dashboardApi.kpis,              ...opts });
  const { data: omzetData, isLoading: omzetLoading }  = useQuery({ queryKey: ["dashboard","omzet-per-maand",   activeDb], queryFn: dashboardApi.omzetPerMaand,     ...opts });
  const { data: topKlanten }                          = useQuery({ queryKey: ["dashboard","top-klanten",        activeDb], queryFn: dashboardApi.topKlanten,        ...opts });
  const { data: recenteWerkbonnen }                   = useQuery({ queryKey: ["dashboard","recente-werkbonnen", activeDb], queryFn: dashboardApi.recenteWerkbonnen, ...opts });
  const { data: urenStats }                           = useQuery({ queryKey: ["dashboard","uren-stats",         activeDb], queryFn: dashboardApi.urenStats,         ...opts });
  const { data: urenPerDag }                          = useQuery({ queryKey: ["dashboard","uren-per-dag",       activeDb], queryFn: dashboardApi.urenPerDag,        ...opts });
  const { data: urenPerMedew }                        = useQuery({ queryKey: ["dashboard","uren-per-medewerker",activeDb], queryFn: dashboardApi.urenPerMedewerker, ...opts });
  const { data: urenPerProj }                         = useQuery({ queryKey: ["dashboard","uren-per-project",   activeDb], queryFn: dashboardApi.urenPerProject,    ...opts });
  const { data: recenteUren }                         = useQuery({ queryKey: ["dashboard","recente-uren",       activeDb], queryFn: dashboardApi.recenteUren,       ...opts });
  const { data: aging }                               = useQuery({ queryKey: ["facturen","aging",               activeDb], queryFn: facturenApi.aging,              ...opts });
  const { data: inkoopKs }                            = useQuery({ queryKey: ["inkoop","per-kostensoort",       activeDb], queryFn: inkoopApi.perKostensoort,       ...opts });
  const { data: openFacturen }                        = useQuery({ queryKey: ["facturen","open-dashboard",      activeDb], queryFn: () => facturenApi.list({ status:"open", pageSize:6, sortBy:"DAGEN_OVERDUE", sortDir:"DESC" }), ...opts });

  // ─── Derived ────────────────────────────────────────────────────────────────
  type K = { omzetDezeMonth: { OMZET: number }; omzetDitJaar: { OMZET: number }; openProjecten: { CNT: number }; openWerkbonnen: { CNT: number }; openDebiteuren: { BEDRAG: number } };
  const k = kpis as K | undefined;
  type U = { UREN_DEZE_WEEK: number; UREN_DEZE_MAAND: number; ACTIEVE_MEDEWERKERS: number };
  const u = urenStats as U | undefined;

  const omzetChart = (omzetData as { JAAR: number; MAAND: number; OMZET: number }[] | undefined)?.map(r => ({
    name: `${MAANDEN[r.MAAND - 1]} '${String(r.JAAR).slice(2)}`,
    omzet: r.OMZET,
    gem:   0,
  })).map((d, i, arr) => ({
    ...d,
    gem: arr.slice(Math.max(0, i - 2), i + 1).reduce((s, x) => s + x.omzet, 0) / Math.min(i + 1, 3),
  })) ?? [];

  const omzetTrend = omzetChart.length >= 2
    ? (() => { const l = omzetChart.at(-1)!.omzet, p = omzetChart.at(-2)!.omzet; return p > 0 ? ((l - p) / p * 100) : 0; })()
    : null;

  const klantChart   = (topKlanten  as { KLANT: string; OMZET: number }[] | undefined)?.map(r => ({ name: r.KLANT.length > 22 ? r.KLANT.slice(0, 20) + "…" : r.KLANT, omzet: r.OMZET })) ?? [];
  const agingData    = aging  as { BUCKET: string; AANTAL: number; BEDRAG: number }[] | undefined;
  const agingTotal   = agingData?.reduce((s, b) => s + b.BEDRAG, 0) ?? 0;
  const ksData       = (inkoopKs as { KOSTENSOORT: string; BEDRAG: number }[] | undefined)?.map(r => ({ name: r.KOSTENSOORT, value: r.BEDRAG })) ?? [];
  const dagData      = (urenPerDag as { DATUM: string; UREN: number }[] | undefined)?.map(r => ({ name: r.DATUM.slice(5), uren: r.UREN })) ?? [];
  const medewData    = (urenPerMedew as { NAAM: string; UREN: number }[] | undefined)?.map(r => ({ name: r.NAAM.split(" ").pop(), uren: r.UREN })) ?? [];
  const projUrenData = (urenPerProj  as { PROJECT: string; NAAM: string; UREN: number }[] | undefined) ?? [];
  const openFact     = (openFacturen as { data: Record<string, unknown>[] } | undefined)?.data ?? [];
  const recUren      = recenteUren  as Record<string, unknown>[] | undefined ?? [];
  const recWerk      = recenteWerkbonnen as Record<string, unknown>[] | undefined ?? [];

  const WERKBON_STATUS_COLOR: Record<string, string> = {
    NIEUW: "#3b82f6", IN_UITVOERING: "#f59e0b", AFGEROND: "#10b981", GEFACTUREERD: "#6366f1",
  };

  return (
    <div className="space-y-7 pb-8">

      {/* ── Paginatitel ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Overzicht bedrijfsactiviteit — {new Date().toLocaleDateString("nl-NL", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}</p>
        </div>
        <Badge variant="outline" className="gap-2 text-xs py-1">
          <span className="flex h-2 w-2"><span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
          Live · Mock data
        </Badge>
      </div>

      {/* ── KPI rij 1: Financieel ── */}
      {show("financieel") && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Financieel</p>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {kpisLoading ? Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-28 rounded-xl"/>) : (<>
              <StatCard label="Omzet deze maand" value={formatCurrency(n(k?.omzetDezeMonth?.OMZET))} sub={omzetTrend !== null ? `${omzetTrend >= 0 ? "▲" : "▼"} ${Math.abs(omzetTrend).toFixed(0)}% t.o.v. vorige maand` : "excl. BTW"} icon={Euro} color="blue" />
              <StatCard label="Omzet dit jaar"   value={formatCurrency(n(k?.omzetDitJaar?.OMZET))}   sub="excl. BTW · YTD" icon={TrendingUp} color="green" />
              <StatCard label="Open debiteuren"  value={formatCurrency(n(k?.openDebiteuren?.BEDRAG))} sub={`${agingData?.reduce((s,b) => s + b.AANTAL, 0) ?? 0} openstaande facturen`} icon={AlertCircle} color="orange" />
              <StatCard label="Actieve projecten" value={String(k?.openProjecten?.CNT ?? "—")}    sub="in uitvoering" icon={FolderKanban} color="purple" />
              <StatCard label="Open werkbonnen"  value={String(k?.openWerkbonnen?.CNT ?? "—")}    sub="nieuw + in uitvoering" icon={ClipboardList} color="orange" />
            </>)}
          </div>
        </div>
      )}

      {/* ── KPI rij 2: Uren & Personeel ── */}
      {show("uren") && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Uren & Personeel (AT_URENBREG)</p>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
            {!u ? Array.from({length:3}).map((_,i) => <Skeleton key={i} className="h-28 rounded-xl"/>) : (<>
              <StatCard label="Uren deze week"    value={`${formatNumber(n(u.UREN_DEZE_WEEK), 1)} u`}   sub="geregistreerde velduren" icon={Clock} color="blue" />
              <StatCard label="Uren deze maand"   value={`${formatNumber(n(u.UREN_DEZE_MAAND), 1)} u`}  sub="alle medewerkers samen" icon={Activity} color="green" />
              <StatCard label="Actieve medewerkers" value={String(u.ACTIEVE_MEDEWERKERS ?? "—")}        sub="urenboekingen deze maand" icon={Users} color="purple" />
            </>)}
          </div>
        </div>
      )}

      {/* ── Grafieken rij 1: Omzet + Inkoop ── */}
      {(show("omzet-grafiek") || show("inkoop-grafiek")) && (
        <div className="grid gap-4 grid-cols-1 xl:grid-cols-3">
          {show("omzet-grafiek") && (
            <Card className={show("inkoop-grafiek") ? "xl:col-span-2" : "xl:col-span-3"}>
              <CardHeader className="pb-2">
                <SectionHeader title="Omzet per maand" description="Laatste maanden excl. BTW — met 3-maands gemiddelde" />
              </CardHeader>
              <CardContent>
                {omzetLoading ? <Skeleton className="h-64 w-full"/> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={omzetChart} margin={{top:4,right:8,left:0,bottom:0}}>
                      <defs>
                        <linearGradient id="go" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.18}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                      <XAxis dataKey="name" tick={{fontSize:11}} />
                      <YAxis tickFormatter={v => `€${(v/1000).toFixed(0)}k`} tick={{fontSize:11}} width={48}/>
                      <Tooltip content={<EuroTooltip />}/>
                      <Legend wrapperStyle={{fontSize:12}}/>
                      <Area type="monotone" dataKey="omzet" name="Omzet" stroke="#3b82f6" strokeWidth={2.5} fill="url(#go)" dot={{r:3,fill:"#3b82f6"}} activeDot={{r:5}}/>
                      <Line type="monotone" dataKey="gem" name="3-mnd gem." stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 3" dot={false}/>
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}
          {show("inkoop-grafiek") && (
            <Card>
              <CardHeader className="pb-2">
                <SectionHeader title="Inkoop per kostensoort" description="Huidig jaar"/>
              </CardHeader>
              <CardContent>
                {ksData.length === 0 ? <Skeleton className="h-64 w-full"/> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={ksData} cx="50%" cy="44%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                        {ksData.map((_,i) => <Cell key={i} fill={getChartColor(i)} stroke="transparent"/>)}
                      </Pie>
                      <Tooltip formatter={v => formatCurrency(Number(v))}/>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11,paddingTop:8}}/>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Grafieken rij 2: Uren per dag + Uren per medewerker ── */}
      {(show("uren-dag") || show("uren-medewerker")) && (
        <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
          {show("uren-dag") && (
            <Card>
              <CardHeader className="pb-2">
                <SectionHeader title="Uren per dag" description="Geregistreerde velduren — laatste 2 weken"/>
              </CardHeader>
              <CardContent>
                {dagData.length === 0 ? <Skeleton className="h-52 w-full"/> : (
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={dagData} margin={{top:4,right:8,left:0,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                      <XAxis dataKey="name" tick={{fontSize:10}}/>
                      <YAxis tick={{fontSize:10}} width={30}/>
                      <Tooltip content={<UrenTooltip/>}/>
                      <Bar dataKey="uren" name="Uren" fill="#3b82f6" radius={[3,3,0,0]} maxBarSize={28}/>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}
          {show("uren-medewerker") && (
            <Card>
              <CardHeader className="pb-2">
                <SectionHeader title="Uren per medewerker" description="Geboekte uren deze maand"/>
              </CardHeader>
              <CardContent>
                {medewData.length === 0 ? <Skeleton className="h-52 w-full"/> : (
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={medewData} layout="vertical" margin={{top:0,right:16,left:0,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)"/>
                      <XAxis type="number" tick={{fontSize:10}}/>
                      <YAxis type="category" dataKey="name" width={90} tick={{fontSize:10}}/>
                      <Tooltip content={<UrenTooltip/>}/>
                      <Bar dataKey="uren" name="Uren" radius={[0,3,3,0]} maxBarSize={18}>
                        {medewData.map((_,i) => <Cell key={i} fill={getChartColor(i)} fillOpacity={0.85}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Rij 3: Top klanten + Aging ── */}
      {(show("top-klanten") || show("aging")) && (
        <div className="grid gap-4 grid-cols-1 xl:grid-cols-3">
          {show("top-klanten") && (
            <Card className={show("aging") ? "xl:col-span-2" : "xl:col-span-3"}>
              <CardHeader className="pb-2">
                <SectionHeader title="Top klanten op omzet" description="Huidig jaar · excl. BTW" href="/klanten" router={router}/>
              </CardHeader>
              <CardContent>
                {klantChart.length === 0 ? <Skeleton className="h-56 w-full"/> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={klantChart} layout="vertical" margin={{top:0,right:16,left:0,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)"/>
                      <XAxis type="number" tickFormatter={v => `€${(v/1000).toFixed(0)}k`} tick={{fontSize:10}}/>
                      <YAxis type="category" dataKey="name" width={150} tick={{fontSize:10}}/>
                      <Tooltip content={<EuroTooltip/>}/>
                      <Bar dataKey="omzet" name="Omzet" radius={[0,4,4,0]} maxBarSize={18}>
                        {klantChart.map((_,i) => <Cell key={i} fill={getChartColor(i)} fillOpacity={0.85}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}
          {show("aging") && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500"/>
                  Openstaande debiteuren
                </CardTitle>
                <CardDescription>Totaal: <span className="font-semibold text-foreground">{formatCurrency(agingTotal)}</span></CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                {!agingData ? Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-8 w-full"/>) :
                 agingData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-36 gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500"/>
                    <p className="text-sm">Geen openstaande posten</p>
                  </div>
                 ) : agingData.map(b => {
                  const pct = agingTotal > 0 ? (b.BEDRAG / agingTotal) * 100 : 0;
                  return (
                    <div key={b.BUCKET} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{background: AGING_COLORS[b.BUCKET] ?? "#94a3b8"}}/>
                          {AGING_LABELS[b.BUCKET] ?? b.BUCKET}
                        </span>
                        <span className="tabular-nums font-medium">{formatCurrency(b.BEDRAG)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{width:`${pct}%`, background: AGING_COLORS[b.BUCKET] ?? "#94a3b8"}}/>
                      </div>
                      <p className="text-xs text-muted-foreground text-right">{b.AANTAL} factuur{b.AANTAL !== 1 ? "en" : ""} · {pct.toFixed(0)}%</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Rij 4: Uren per project + Recente uren ── */}
      {(show("uren-project") || show("recente-uren")) && (
        <div className="grid gap-4 grid-cols-1 xl:grid-cols-5">
          {show("uren-project") && (
            <Card className={show("recente-uren") ? "xl:col-span-2" : "xl:col-span-5"}>
              <CardHeader className="pb-2">
                <SectionHeader title="Uren per project" description="Top 8 projecten — deze maand"/>
              </CardHeader>
              <CardContent>
                {projUrenData.length === 0 ? <Skeleton className="h-64 w-full"/> : (
                  <div className="space-y-2.5">
                    {projUrenData.map((p, i) => {
                      const max = projUrenData[0].UREN;
                      const pct = max > 0 ? (p.UREN / max) * 100 : 0;
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground truncate max-w-[200px]" title={p.NAAM}>{p.NAAM}</span>
                            <span className="font-semibold tabular-nums ml-2 shrink-0">{formatNumber(p.UREN, 1)} u</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{width:`${pct}%`, background: getChartColor(i)}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {show("recente-uren") && (
            <Card className={show("uren-project") ? "xl:col-span-3" : "xl:col-span-5"}>
              <CardHeader className="pb-2">
                <SectionHeader title="Recente uren" description="Laatste registraties (AT_URENBREG)" href="/werkbonnen" router={router}/>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        {["Datum","Medewerker","Project","Taak","Uren"].map(h => (
                          <th key={h} className="text-left pb-2 pr-3 last:pr-0 last:text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recUren.length === 0 ? (
                        Array.from({length:5}).map((_,i) => (
                          <tr key={i} className="border-b last:border-0">
                            {[1,2,3,4,5].map(j => <td key={j} className="py-2 pr-3"><Skeleton className="h-4 w-full"/></td>)}
                          </tr>
                        ))
                      ) : recUren.slice(0,8).map((r,i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                          <td className="py-2 pr-3 tabular-nums text-muted-foreground">{formatDate(String(r.DATUM ?? ""))}</td>
                          <td className="py-2 pr-3 font-medium">{String(r.MEDEWERKER ?? "")}</td>
                          <td className="py-2 pr-3 text-muted-foreground text-xs max-w-[160px] truncate" title={String(r.WERK_NAAM ?? "")}>{String(r.WERK_CODE ?? "")} {String(r.WERK_NAAM ?? "").length > 20 ? String(r.WERK_NAAM ?? "").slice(0,18)+"…" : String(r.WERK_NAAM ?? "")}</td>
                          <td className="py-2 pr-3"><Badge variant="outline" className="text-xs py-0">{String(r.TAAK ?? "")}</Badge></td>
                          <td className="py-2 text-right tabular-nums font-semibold">{formatNumber(n(r.AANTAL),1)}u</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Rij 5: Recente werkbonnen + Openstaande facturen ── */}
      {(show("werkbonnen") || show("open-facturen")) && (
        <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
          {show("werkbonnen") && (
            <Card>
              <CardHeader className="pb-2">
                <SectionHeader title="Recente werkbonnen" description="Laatste 6 werkbonnen" href="/werkbonnen" router={router}/>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {["Nummer","Klant","Datum","Status"].map(h => (
                        <th key={h} className="text-left pb-2 pr-3 last:pr-0 font-medium text-muted-foreground text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recWerk.slice(0,6).map((w,i) => {
                      const status = String(w.STATUS ?? "");
                      return (
                        <tr key={i} onClick={() => router.push("/werkbonnen")} className="border-b last:border-0 hover:bg-muted/40 transition-colors cursor-pointer">
                          <td className="py-2.5 pr-3"><span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{String(w.BONNUMMER ?? "")}</span></td>
                          <td className="py-2.5 pr-3 text-muted-foreground truncate max-w-[140px]">{String(w.KLANT ?? "")}</td>
                          <td className="py-2.5 pr-3 text-muted-foreground tabular-nums">{formatDate(String(w.DATUM ?? ""))}</td>
                          <td className="py-2.5">
                            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
                              style={{ background: `${WERKBON_STATUS_COLOR[status] ?? "#94a3b8"}20`, color: WERKBON_STATUS_COLOR[status] ?? "#94a3b8" }}>
                              {status.replace("_"," ")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
          {show("open-facturen") && (
            <Card>
              <CardHeader className="pb-2">
                <SectionHeader title="Openstaande facturen" description="Gesorteerd op overdue — top 6" href="/facturen?tab=open" router={router}/>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {["Klant","Factuur","Openstaand","Overdue"].map(h => (
                        <th key={h} className="text-left pb-2 pr-3 last:pr-0 font-medium text-muted-foreground text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {openFact.length === 0 ? (
                      <tr><td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">Geen openstaande facturen</td></tr>
                    ) : openFact.map((f,i) => {
                      const ov = Number(f.DAGEN_OVERDUE ?? 0);
                      const col = ov > 90 ? "#ef4444" : ov > 60 ? "#f97316" : ov > 30 ? "#f59e0b" : ov > 0 ? "#84cc16" : "#10b981";
                      return (
                        <tr key={i} onClick={() => router.push(`/facturen/${f.ID}`)} className="border-b last:border-0 hover:bg-muted/40 transition-colors cursor-pointer">
                          <td className="py-2.5 pr-3 truncate max-w-[130px] font-medium">{String(f.KLANT ?? "")}</td>
                          <td className="py-2.5 pr-3 font-mono text-xs text-muted-foreground">{String(f.FACTUURNUMMER ?? "")}</td>
                          <td className="py-2.5 pr-3 tabular-nums font-semibold">{formatCurrency(n(f.OPENSTAAND))}</td>
                          <td className="py-2.5">
                            {ov > 0
                              ? <span className="text-xs font-semibold" style={{color: col}}>{ov}d</span>
                              : <span className="text-xs text-emerald-600">Op tijd</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

    </div>
  );
}

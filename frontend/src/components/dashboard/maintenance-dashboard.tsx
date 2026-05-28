"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Wrench, Building2, TrendingUp, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import type { MaintenanceKlant, WeekStats, MaandStats } from "@/lib/mock/maintenance-data";
import { CATEGORIE_LABELS } from "@/lib/mock/maintenance-data";
import type { WerkbonCategorie } from "@/lib/mock/maintenance-data";

const CAT_COLORS: Record<WerkbonCategorie, string> = {
  ONDERHOUD:    "#2563eb",
  EW:           "#10b981",
  CV:           "#f59e0b",
  SLUITING_300: "#8b5cf6",
  KLUSSEN_300:  "#ef4444",
};

interface KlantWithSummary extends MaintenanceKlant {
  summary: {
    week:  { omzet: number; totaal: number; uitgevoerd: number; openstaand: number };
    maand: { omzet: number; totaal: number; uitgevoerd: number; openstaand: number };
    jaar:  { omzet: number; totaal: number; uitgevoerd: number; openstaand: number };
  };
}

interface CatStat { categorie: WerkbonCategorie; label: string; totaal: number; omzet: number; uitgevoerd: number; openstaand: number }

export function MaintenanceDashboard() {
  const router = useRouter();

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

  const { data: catStats } = useQuery<CatStat[]>({
    queryKey: ["maintenance", "categorie-stats"],
    queryFn:  () => fetch("/api/v1/maintenance/werkbonnen?pageSize=1&page=1").then(() =>
      // derive from klanten endpoint; we compute cats client-side from pre-aggregated data
      fetch("/api/v1/maintenance/omzet?periode=maand&n=1").then(r => r.json())
    ),
    enabled: false, // we derive this from werkbonnen stats endpoint instead
  });

  // ── Derived totals ───────────────────────────────────────────────────────────
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Maintenance — overzicht werkbonnen & omzet</p>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Klanten",           value: String(allKlanten.length),             icon: Building2,   color: "text-blue-600 dark:text-blue-400" },
          { label: "Omzet deze week",   value: formatCurrency(huidigWeek?.omzet ?? totaalWeekOmzet),  icon: TrendingUp,  color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Omzet deze maand",  value: formatCurrency(huidigMaand?.omzet ?? totaalMaandOmzet), icon: TrendingUp,  color: "text-blue-600 dark:text-blue-400" },
          { label: "Bons deze week",    value: String(huidigWeek?.totaal ?? totaalWeekBons),           icon: Wrench,      color: "text-slate-600" },
          { label: "Uitgevoerd (maand)",value: String(huidigMaand?.uitgevoerd ?? uitgevoerdTotaal),    icon: CheckCircle2,color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Openstaand (maand)",value: String(huidigMaand?.openstaand ?? openstaandTotaal),    icon: AlertCircle, color: "text-orange-600 dark:text-orange-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
              </div>
              <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Omzet per week (laatste 8 weken)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weekStats ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                <Bar dataKey="omzet" name="Omzet" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Werkbon status (laatste 6 maanden)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={maandStats ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="uitgevoerd" name="Uitgevoerd" stackId="a" fill="#10b981" />
                <Bar dataKey="openstaand" name="Openstaand" stackId="a" fill="#f59e0b" />
                <Bar dataKey="aangemaakt" name="Aangemaakt" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Klanten tabel ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Per klant — week & maand totalen</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {klantenLoading ? (
            <div className="p-4 space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Klant</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground border-l border-muted" colSpan={3}>Deze week</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground border-l border-muted" colSpan={3}>Deze maand</th>
                  </tr>
                  <tr className="bg-muted/20 border-b">
                    <th className="px-4 py-1.5" />
                    <th className="px-3 py-1.5 text-right text-[10px] text-muted-foreground border-l border-muted">Omzet</th>
                    <th className="px-3 py-1.5 text-right text-[10px] text-muted-foreground">Bons</th>
                    <th className="px-3 py-1.5 text-right text-[10px] text-muted-foreground">Open</th>
                    <th className="px-3 py-1.5 text-right text-[10px] text-muted-foreground border-l border-muted">Omzet</th>
                    <th className="px-3 py-1.5 text-right text-[10px] text-muted-foreground">Bons</th>
                    <th className="px-3 py-1.5 text-right text-[10px] text-muted-foreground">Open</th>
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
                        <p className="font-medium">{k.naam}</p>
                        <p className="text-[10px] text-muted-foreground">{k.variant}</p>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold border-l border-muted">{formatCurrency(k.summary.week.omzet)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{k.summary.week.totaal}</td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${k.summary.week.openstaand > 0 ? "text-orange-600 dark:text-orange-400 font-medium" : "text-muted-foreground"}`}>
                        {k.summary.week.openstaand}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold border-l border-muted">{formatCurrency(k.summary.maand.omzet)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{k.summary.maand.totaal}</td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${k.summary.maand.openstaand > 0 ? "text-orange-600 dark:text-orange-400 font-medium" : "text-muted-foreground"}`}>
                        {k.summary.maand.openstaand}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/30 font-semibold">
                  <tr>
                    <td className="px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Totaal</td>
                    <td className="px-3 py-2.5 text-right tabular-nums border-l border-muted">{formatCurrency(totaalWeekOmzet)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{totaalWeekBons}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-orange-600">{allKlanten.reduce((s, k) => s + k.summary.week.openstaand, 0)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums border-l border-muted">{formatCurrency(totaalMaandOmzet)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{totaalMaandBons}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-orange-600">{allKlanten.reduce((s, k) => s + k.summary.maand.openstaand, 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

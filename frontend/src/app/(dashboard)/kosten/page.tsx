"use client";

import { useQuery } from "@tanstack/react-query";
import { inkoopApi } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import { useActiveDb } from "@/hooks/use-active-db";
import { useViewTypeSafe } from "@/hooks/use-view-type-safe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { CHART_COLORS } from "@/lib/chart-colors";
import { getCategorieStats, CATEGORIE_LABELS } from "@/lib/mock/maintenance-data";
import type { WerkbonCategorie } from "@/lib/mock/maintenance-data";

type KostensoortRow = { KOSTENSOORT: string; BEDRAG: number; PCT: number };

// ── Type B — maintenance categorie kosten ─────────────────────────────────────

function MaintenanceKostenPage() {
  const rawStats = getCategorieStats();
  const totaal = rawStats.reduce((s, c) => s + c.omzet, 0);
  const rows = rawStats.map(c => ({
    KOSTENSOORT: CATEGORIE_LABELS[c.categorie as WerkbonCategorie],
    BEDRAG: c.omzet,
    PCT: totaal > 0 ? (c.omzet / totaal) * 100 : 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Omzet per categorie</h1>
        <p className="text-sm text-muted-foreground mt-1">Verdeling omzet per werkbon categorie — Maintenance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader><CardTitle className="text-sm">Totale omzet</CardTitle></CardHeader>
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

      <KostenCharts rows={rows} />
      <KostenTabel rows={rows} totaal={totaal} />
    </div>
  );
}

// ── Type A — project inkoop kosten ────────────────────────────────────────────

function ProjectKostenPage({ activeDb }: { activeDb: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["inkoop", "per-kostensoort", activeDb],
    queryFn:  () => inkoopApi.perKostensoort() as Promise<KostensoortRow[]>,
  });

  const rows = data ?? [];
  const totaal = rows.reduce((s, r) => s + r.BEDRAG, 0);

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
        : <KostenCharts rows={rows} />
      }
      <KostenTabel rows={rows} totaal={totaal} />
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function KostenCharts({ rows }: { rows: KostensoortRow[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="text-sm">Verdeling</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={rows} dataKey="BEDRAG" nameKey="KOSTENSOORT" cx="50%" cy="50%" outerRadius={100}
                label={(p) => `${p.name} ${((p.percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                {rows.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Bedrag per categorie</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={rows} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="KOSTENSOORT" tick={{ fontSize: 11 }} width={115} />
              <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
              <Bar dataKey="BEDRAG" radius={[0, 4, 4, 0]}>
                {rows.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function KostenTabel({ rows, totaal }: { rows: KostensoortRow[]; totaal: number }) {
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
              <tr key={r.KOSTENSOORT} className="border-b last:border-0 hover:bg-muted/30">
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
  const viewType = useViewTypeSafe();
  const activeDb = useActiveDb();
  return viewType === "CUSTOMER"
    ? <MaintenanceKostenPage />
    : <ProjectKostenPage activeDb={activeDb} />;
}

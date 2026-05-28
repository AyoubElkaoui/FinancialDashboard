"use client";

import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, LineChart, Line, Legend,
} from "recharts";
import type { JaarStats, MaandStats } from "@/lib/mock/maintenance-data";

interface IndexData {
  jaarStats: JaarStats[];
  maandVergelijking: { huidigJaar: MaandStats[]; vorigJaar: MaandStats[] };
}

const MAAND_LABELS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export default function JaarIndexPage() {
  const { data, isLoading } = useQuery<IndexData>({
    queryKey: ["maintenance", "jaar-index"],
    queryFn:  () => fetch("/api/v1/maintenance/jaar-index").then(r => r.json()),
    staleTime: 300_000,
  });

  const jaarStats = data?.jaarStats ?? [];
  const huidig    = data?.maandVergelijking.huidigJaar ?? [];
  const vorig     = data?.maandVergelijking.vorigJaar  ?? [];

  // Merge maand comparison into single chart dataset
  const maandChart = MAAND_LABELS.map((label, idx) => {
    const mo = idx + 1;
    return {
      maand:      label,
      huidigJaar: huidig.find(m => m.maand === mo)?.omzet ?? null,
      vorigJaar:  vorig.find(m  => m.maand === mo)?.omzet ?? null,
    };
  });

  const jaarChartData = jaarStats.map(s => ({
    jaar:       String(s.jaar),
    omzet:      s.omzet,
    pct:        s.pctVsVorig,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Index</h1>
        <p className="text-sm text-muted-foreground mt-1">Jaaromzet en groei t.o.v. voorgaande jaren — Maintenance</p>
      </div>

      {/* KPI cards per jaar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {jaarStats.map(s => (
          <Card key={s.jaar}>
            <CardHeader>
              <CardTitle className="text-xs text-muted-foreground">{s.jaar}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(s.omzet)}</p>
              <p className="text-xs text-muted-foreground">{s.totaal} werkbonnen</p>
              {s.pctVsVorig !== null && (
                <span className={`inline-flex items-center gap-1 text-sm font-semibold ${s.pctVsVorig >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {s.pctVsVorig >= 0 ? "▲" : "▼"} {Math.abs(s.pctVsVorig).toFixed(1)}% vs {s.jaar - 1}
                </span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Yearly bar chart */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Omzet per jaar</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="h-64 animate-pulse bg-muted rounded" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={jaarChartData} margin={{ top: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="jaar" tick={{ fontSize: 13, fontWeight: 600 }} />
                <YAxis tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                <Bar dataKey="omzet" name="Omzet" fill="#2563eb" radius={[6, 6, 0, 0]}
                  label={{ position: "top", formatter: (v: unknown) => formatCurrency(Number(v)), fontSize: 11, fill: "#64748b" }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Year-over-year % growth */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Groei % t.o.v. vorig jaar</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Jaar</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Omzet</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Werkbonnen</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Groei %</th>
              </tr>
            </thead>
            <tbody>
              {[...jaarStats].reverse().map((s, i) => (
                <tr key={s.jaar} className={`border-b last:border-0 hover:bg-muted/30 ${i % 2 === 1 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-2.5 font-semibold">{s.jaar}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatCurrency(s.omzet)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{s.totaal}</td>
                  <td className="px-4 py-2.5 text-right">
                    {s.pctVsVorig === null ? (
                      <span className="text-muted-foreground text-xs">basisjaar</span>
                    ) : (
                      <span className={`font-semibold tabular-nums ${s.pctVsVorig >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {s.pctVsVorig >= 0 ? "+" : ""}{s.pctVsVorig.toFixed(1)}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Month-over-month comparison current vs previous year */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Omzet per maand — 2026 vs 2025</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="h-64 animate-pulse bg-muted rounded" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={maandChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="maand" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: unknown) => v != null ? formatCurrency(Number(v)) : "—"} />
                <Legend />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <Line dataKey="vorigJaar"  name="2025" stroke="#94a3b8" strokeWidth={2} dot={false} strokeDasharray="4 3" connectNulls />
                <Line dataKey="huidigJaar" name="2026" stroke="#2563eb" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

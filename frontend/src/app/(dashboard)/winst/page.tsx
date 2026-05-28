"use client";

import { useQuery } from "@tanstack/react-query";
import { projectenApi } from "@/lib/api-client";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { useActiveDb } from "@/hooks/use-active-db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { ElmarProjectSummary } from "@/lib/mock/elmar-data";

export default function WinstPage() {
  const activeDb = useActiveDb();

  const { data, isLoading } = useQuery<{ data: ElmarProjectSummary[]; total: number }>({
    queryKey: ["projecten", activeDb, "winst"],
    queryFn:  () => fetch(`/api/v1/projecten?database=${activeDb}&pageSize=100`).then(r => r.json()),
  });

  const projecten = (data?.data ?? []).filter(p => p.BRUTOMARGE !== 0 || p.TOTALE_KOSTEN > 0);
  const totaalMarge  = projecten.reduce((s, p) => s + p.BRUTOMARGE, 0);
  const totaalOmzet  = projecten.reduce((s, p) => s + p.GEFACTUREERD_TOTAAL, 0);
  const gemMargePct  = totaalOmzet > 0 ? (totaalMarge / totaalOmzet) * 100 : 0;
  const positief     = projecten.filter(p => p.BRUTOMARGE >= 0).length;
  const negatief     = projecten.filter(p => p.BRUTOMARGE < 0).length;

  const chartData = [...projecten]
    .sort((a, b) => b.BRUTOMARGE - a.BRUTOMARGE)
    .map(p => ({ naam: p.PROJECTNUMMER, marge: p.BRUTOMARGE, pct: p.MARGE_PCT }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Winst</h1>
        <p className="text-sm text-muted-foreground mt-1">Brutomarge per project — {activeDb}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Totale brutomarge", value: formatCurrency(totaalMarge), color: totaalMarge >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600" },
          { label: "Gemiddelde marge %", value: formatPercentage(gemMargePct), color: gemMargePct >= 10 ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600" },
          { label: "Winstgevend", value: `${positief} projecten`, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Verliesgevend", value: `${negatief} projecten`, color: negatief > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground" },
        ].map(c => (
          <Card key={c.label}>
            <CardHeader><CardTitle className="text-xs text-muted-foreground">{c.label}</CardTitle></CardHeader>
            <CardContent><p className={`text-2xl font-bold tabular-nums ${c.color}`}>{c.value}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Brutomarge per project</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="h-72 animate-pulse bg-muted rounded" /> : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="naam" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} labelFormatter={l => `Project ${l}`} />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <Bar dataKey="marge" name="Brutomarge" radius={[4, 4, 0, 0]}
                  fill="#10b981"
                  label={false}
                />
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
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Gefactureerd</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Totale kosten</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Brutomarge</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Marge %</th>
                </tr>
              </thead>
              <tbody>
                {[...projecten].sort((a, b) => b.BRUTOMARGE - a.BRUTOMARGE).map((p, i) => (
                  <tr key={p.ID} className={`border-b last:border-0 hover:bg-muted/30 ${i % 2 === 1 ? "bg-muted/10" : ""}`}>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{p.PROJECTNUMMER}</td>
                    <td className="px-4 py-2.5 font-medium max-w-[200px] truncate">{p.NAAM}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(p.GEFACTUREERD_TOTAAL)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatCurrency(p.TOTALE_KOSTEN)}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${p.BRUTOMARGE >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {formatCurrency(p.BRUTOMARGE)}
                    </td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${p.MARGE_PCT >= 15 ? "text-emerald-600 dark:text-emerald-400" : p.MARGE_PCT >= 0 ? "" : "text-red-600 dark:text-red-400"}`}>
                      {formatPercentage(p.MARGE_PCT)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

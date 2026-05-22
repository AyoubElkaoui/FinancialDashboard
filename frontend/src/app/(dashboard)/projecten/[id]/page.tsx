"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { projectenApi } from "@/lib/api-client";
import { formatDate, formatCurrency, formatPercentage } from "@/lib/format";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Calendar, Euro, Building2, User, TrendingUp,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["projecten", id],
    queryFn: () => projectenApi.detail(Number(id)),
  });

  const p = data as Record<string, unknown> | undefined;
  const werkbonnen = (p?.werkbonnen as Record<string, unknown>[] | undefined) ?? [];
  const facturen   = (p?.facturen   as Record<string, unknown>[] | undefined) ?? [];

  // Financiële berekeningen
  const omzet   = facturen.reduce((s, f) => s + Number(f.TOTAALBEDRAG ?? 0), 0);
  const kosten  = werkbonnen.reduce((s, w) => s + Number(w.KOSTEN ?? 0), 0);
  const bMarge  = omzet - kosten;
  const margePct = omzet > 0 ? (bMarge / omzet) * 100 : 0;

  const chartData = [
    { name: "Financiën", Omzet: omzet, Kosten: kosten },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!p) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <p className="text-lg font-medium">Project niet gevonden</p>
        <Button variant="outline" onClick={() => router.back()}>Terug</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="mt-0.5 shrink-0">
          <ArrowLeft className="h-4 w-4 mr-1.5" />Terug
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {String(p.PROJECTNUMMER ?? "")}
            </span>
            <StatusBadge status={String(p.STATUS ?? "")} />
          </div>
          <h1 className="text-2xl font-bold mt-1 leading-tight">{String(p.NAAM ?? "")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {String(p.KLANT ?? "")}
            {p.PROJECTLEIDER ? ` · Projectleider: ${String(p.PROJECTLEIDER)}` : ""}
          </p>
        </div>
      </div>

      {/* 4 StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Omzet"
          value={formatCurrency(omzet)}
          sub="alle facturen"
          icon={Euro}
          color="blue"
        />
        <StatCard
          label="Kosten"
          value={formatCurrency(kosten)}
          sub="inkoopfacturen"
          icon={Euro}
          color="orange"
        />
        <StatCard
          label="B Marge"
          value={formatCurrency(bMarge)}
          sub="omzet - kosten"
          icon={TrendingUp}
          color={bMarge >= 0 ? "green" : "red"}
        />
        <StatCard
          label="Marge %"
          value={formatPercentage(margePct)}
          sub="van omzet"
          icon={TrendingUp}
          color={margePct >= 0 ? "green" : "red"}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overzicht">
        <TabsList>
          <TabsTrigger value="overzicht">Overzicht</TabsTrigger>
          <TabsTrigger value="werkbonnen">Werkbonnen ({werkbonnen.length})</TabsTrigger>
          <TabsTrigger value="facturen">Facturen ({facturen.length})</TabsTrigger>
        </TabsList>

        {/* Tab: Overzicht */}
        <TabsContent value="overzicht" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Projectinformatie */}
            <Card>
              <CardHeader><CardTitle className="text-base">Projectinformatie</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  { label: "Klant",         value: p.KLANT,         icon: Building2 },
                  { label: "Projectleider", value: p.PROJECTLEIDER, icon: User },
                  { label: "Startdatum",    value: formatDate(String(p.STARTDATUM ?? "")), icon: Calendar },
                  { label: "Einddatum",     value: p.EINDDATUM ? formatDate(String(p.EINDDATUM)) : "—", icon: Calendar },
                  { label: "Status",        value: <StatusBadge status={String(p.STATUS ?? "")} />, icon: null },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3">
                    {Icon ? <Icon className="h-4 w-4 text-muted-foreground shrink-0" /> : <span className="h-4 w-4 shrink-0" />}
                    <span className="text-muted-foreground w-32 shrink-0">{label}</span>
                    <span className="font-medium">{value as React.ReactNode ?? "—"}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Omzet vs Kosten chart */}
            <Card>
              <CardHeader><CardTitle className="text-base">Omzet vs Kosten</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `€${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="Omzet" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Kosten" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Werkbonnen */}
        <TabsContent value="werkbonnen" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {werkbonnen.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <p className="text-sm">Geen werkbonnen gekoppeld aan dit project</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Bonnummer</th>
                        <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Datum</th>
                        <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Omschrijving</th>
                        <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Type</th>
                        <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fase</th>
                        <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Kosten</th>
                        <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Opbrengsten</th>
                        <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Marge%</th>
                        <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {werkbonnen.map((w, i) => (
                        <tr
                          key={i}
                          className="border-b last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                          onClick={() => router.push(`/werkbonnen/${String(w.ID ?? "")}`)}
                        >
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{String(w.BONNUMMER ?? "")}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(String(w.DATUM ?? ""))}</td>
                          <td className="px-4 py-3 font-medium max-w-[200px] truncate">{String(w.OMSCHRIJVING ?? "")}</td>
                          <td className="px-4 py-3 text-muted-foreground">{String(w.TYPE ?? "—")}</td>
                          <td className="px-4 py-3 text-muted-foreground">{String(w.FASE ?? "—")}</td>
                          <td className="px-4 py-3 tabular-nums text-right">{formatCurrency(Number(w.KOSTEN ?? 0))}</td>
                          <td className="px-4 py-3 tabular-nums text-right">{formatCurrency(Number(w.OPBRENGSTEN ?? 0))}</td>
                          <td className="px-4 py-3 tabular-nums text-right">
                            <span className={Number(w.MARGE_PCT ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}>
                              {formatPercentage(Number(w.MARGE_PCT ?? 0))}
                            </span>
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={String(w.STATUS ?? "")} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Facturen */}
        <TabsContent value="facturen" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {facturen.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <p className="text-sm">Geen facturen gekoppeld aan dit project</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Factuurnummer</th>
                        <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Datum</th>
                        <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Bedrag excl.</th>
                        <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">BTW</th>
                        <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Totaal</th>
                        <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Openstaand</th>
                        <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facturen.map((f, i) => (
                        <tr
                          key={i}
                          className="border-b last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                          onClick={() => router.push(`/facturen/${String(f.ID ?? "")}`)}
                        >
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{String(f.FACTUURNUMMER ?? "")}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(String(f.DATUM ?? ""))}</td>
                          <td className="px-4 py-3 tabular-nums text-right">{formatCurrency(Number(f.BEDRAG_EXCL ?? 0))}</td>
                          <td className="px-4 py-3 tabular-nums text-right">{formatCurrency(Number(f.BTW ?? 0))}</td>
                          <td className="px-4 py-3 tabular-nums text-right font-semibold">{formatCurrency(Number(f.TOTAALBEDRAG ?? 0))}</td>
                          <td className="px-4 py-3 tabular-nums text-right">
                            <span className={Number(f.OPENSTAAND ?? 0) > 0 ? "text-orange-600 font-semibold" : "text-muted-foreground"}>
                              {formatCurrency(Number(f.OPENSTAAND ?? 0))}
                            </span>
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={String(f.STATUS ?? "")} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

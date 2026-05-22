"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { facturenApi } from "@/lib/api-client";
import { formatDate, formatCurrency } from "@/lib/format";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Euro, Calendar, Building2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function FactuurDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["facturen", id],
    queryFn: () => facturenApi.detail(Number(id)),
  });

  const f = data as Record<string, unknown> | undefined;
  const regels = (f?.regels as Record<string, unknown>[] | undefined) ?? [];
  const overdue = Number(f?.DAGEN_OVERDUE ?? 0);
  const openstaand = Number(f?.OPENSTAAND ?? 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i=><Skeleton key={i} className="h-24"/>)}</div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!f) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
      <p className="text-lg font-medium">Factuur niet gevonden</p>
      <Button variant="outline" onClick={() => router.back()}>Terug</Button>
    </div>
  );

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
              {String(f.FACTUURNUMMER ?? "")}
            </span>
            <StatusBadge status={String(f.STATUS ?? "")} />
            {overdue > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-300 px-2 py-0.5 rounded-md">
                <AlertCircle className="h-3 w-3" />
                {overdue} dagen te laat
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold mt-1">{String(f.KLANT ?? "")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {String(f.ADRES ?? "")} · {String(f.POSTCODE ?? "")} {String(f.PLAATS ?? "")}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Excl. BTW"     value={formatCurrency(Number(f.BEDRAG_EXCL ?? 0))} icon={Euro}         color="blue"  />
        <StatCard label="BTW (21%)"     value={formatCurrency(Number(f.BTW ?? 0))}          icon={Euro}         color="slate" />
        <StatCard label="Totaalbedrag"  value={formatCurrency(Number(f.TOTAALBEDRAG ?? 0))} icon={Euro}         color="purple"/>
        <StatCard
          label="Openstaand"
          value={formatCurrency(openstaand)}
          sub={openstaand <= 0 ? "Volledig betaald" : overdue > 0 ? `${overdue}d overdue` : "Binnen termijn"}
          icon={openstaand <= 0 ? CheckCircle2 : AlertCircle}
          color={openstaand <= 0 ? "green" : overdue > 0 ? "red" : "orange"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Factuurdetails */}
        <Card>
          <CardHeader><CardTitle className="text-base">Factuurgegevens</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: "Klant",      value: f.KLANT,                                  icon: Building2 },
              { label: "Factuurdatum", value: formatDate(String(f.DATUM ?? "")),       icon: Calendar  },
              { label: "Vervaldatum", value: formatDate(String(f.VERVALDATUM ?? "")), icon: Calendar  },
              { label: "Status",     value: <StatusBadge status={String(f.STATUS ?? "")} />, icon: null },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3">
                {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
                {!Icon && <span className="h-4 w-4 shrink-0" />}
                <span className="text-muted-foreground w-28 shrink-0">{label}</span>
                <span className="font-medium">{value as React.ReactNode ?? "—"}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Factuurregels */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Factuurregels</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">Omschrijving</th>
                  <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide text-right">Bedrag</th>
                </tr>
              </thead>
              <tbody>
                {regels.length === 0 ? (
                  <tr><td colSpan={2} className="py-6 text-center text-muted-foreground">Geen regels beschikbaar</td></tr>
                ) : regels.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{String(r.OMSCHRIJVING ?? "")}</p>
                      {r.AANTAL ? <p className="text-xs text-muted-foreground">{String(r.AANTAL)} × {formatCurrency(Number(r.PRIJS ?? 0))}</p> : null}
                    </td>
                    <td className="py-3 text-right tabular-nums font-semibold">{formatCurrency(Number(r.BEDRAG ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2">
                <tr>
                  <td className="pt-3 font-semibold">Subtotaal excl. BTW</td>
                  <td className="pt-3 text-right tabular-nums font-semibold">{formatCurrency(Number(f.BEDRAG_EXCL ?? 0))}</td>
                </tr>
                <tr>
                  <td className="pt-1 text-muted-foreground">BTW (21%)</td>
                  <td className="pt-1 text-right tabular-nums text-muted-foreground">{formatCurrency(Number(f.BTW ?? 0))}</td>
                </tr>
                <tr>
                  <td className="pt-2 text-lg font-bold">Totaal</td>
                  <td className="pt-2 text-right text-lg tabular-nums font-bold text-primary">{formatCurrency(Number(f.TOTAALBEDRAG ?? 0))}</td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

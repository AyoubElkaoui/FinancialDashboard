"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { werkbonnenApi } from "@/lib/api-client";
import { formatDate, formatCurrency } from "@/lib/format";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Building2, User, Wrench, FolderKanban } from "lucide-react";

export default function WerkbonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["werkbonnen", id],
    queryFn: () => werkbonnenApi.detail(Number(id)),
  });

  const w = data as Record<string, unknown> | undefined;
  const regels = (w?.regels as Record<string, unknown>[] | undefined) ?? [];
  const totalBedrag = regels.reduce((s, r) => s + Number(r.BEDRAG ?? 0), 0);

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i=><Skeleton key={i} className="h-24"/>)}</div>
      <Skeleton className="h-48"/>
    </div>
  );

  if (!w) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
      <p className="text-lg font-medium">Werkbon niet gevonden</p>
      <Button variant="outline" onClick={() => router.back()}>Terug</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="mt-0.5 shrink-0">
          <ArrowLeft className="h-4 w-4 mr-1.5" />Terug
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {String(w.BONNUMMER ?? "")}
            </span>
            <StatusBadge status={String(w.STATUS ?? "")} />
          </div>
          <h1 className="text-2xl font-bold mt-1">{String(w.OMSCHRIJVING ?? "")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{String(w.KLANT ?? "")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Klant"       value={String(w.KLANT ?? "—").split(" ").slice(0,2).join(" ")} icon={Building2} color="blue"   />
        <StatCard label="Datum"       value={formatDate(String(w.DATUM ?? ""))}       icon={Calendar}     color="slate"  />
        <StatCard label="Monteur"     value={String(w.MONTEUR ?? "—")}                icon={User}         color="purple" />
        <StatCard label="Totaalbedrag" value={formatCurrency(totalBedrag)}            icon={Wrench}       color="green"  />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Werkboninformatie</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: "Klant",    value: w.KLANT,                                 icon: Building2  },
              { label: "Monteur",  value: w.MONTEUR,                               icon: User       },
              { label: "Datum",    value: formatDate(String(w.DATUM ?? "")),        icon: Calendar   },
              { label: "Project",  value: w.PROJECTNUMMER ?? "—",                  icon: FolderKanban},
              { label: "Status",   value: <StatusBadge status={String(w.STATUS ?? "")}/>, icon: null},
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3">
                {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0"/>}
                {!Icon && <span className="h-4 w-4 shrink-0"/>}
                <span className="text-muted-foreground w-24 shrink-0">{label}</span>
                <span className="font-medium">{value as React.ReactNode ?? "—"}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Regels */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Werkzaamheden & materialen</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">Soort</th>
                  <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">Omschrijving</th>
                  <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide text-right">Bedrag</th>
                </tr>
              </thead>
              <tbody>
                {regels.length === 0 ? (
                  <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">Geen regels beschikbaar</td></tr>
                ) : regels.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3 pr-3">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium
                        ${String(r.SOORT) === "ARBEID"
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                        {String(r.SOORT ?? "")}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium">{String(r.OMSCHRIJVING ?? "")}</p>
                      {r.UREN  ? <p className="text-xs text-muted-foreground">{String(r.UREN)} uur</p>  : null}
                      {r.AANTAL ? <p className="text-xs text-muted-foreground">{String(r.AANTAL)} st.</p> : null}
                    </td>
                    <td className="py-3 text-right tabular-nums font-semibold">{formatCurrency(Number(r.BEDRAG ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
              {totalBedrag > 0 && (
                <tfoot className="border-t-2">
                  <tr>
                    <td colSpan={2} className="pt-3 text-lg font-bold">Totaal</td>
                    <td className="pt-3 text-right text-lg tabular-nums font-bold text-primary">{formatCurrency(totalBedrag)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

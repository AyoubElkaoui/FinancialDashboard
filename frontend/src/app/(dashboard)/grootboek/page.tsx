"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { grootboekApi } from "@/lib/api-client";
import { formatDate, formatCurrency } from "@/lib/format";
import { DataTable } from "@/components/tables/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryParams } from "@/hooks/use-query-params";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useActiveDb } from "@/hooks/use-active-db";

type Mutatie = Record<string, unknown>;
type Resultaat = Record<string, unknown>;

const mutatieColumns: ColumnDef<Mutatie>[] = [
  { accessorKey: "DATUM", header: "Datum", cell: ({ getValue }) => formatDate(String(getValue() ?? "")) },
  { accessorKey: "REKENINGNUMMER", header: "Rekening", size: 80 },
  { accessorKey: "RUBRIEK", header: "Rubriek" },
  { accessorKey: "OMSCHRIJVING", header: "Omschrijving" },
  {
    accessorKey: "DEBET",
    header: "Debet",
    cell: ({ getValue }) => {
      const v = Number(getValue() ?? 0);
      return v > 0 ? <span className="tabular-nums text-red-600">{formatCurrency(v)}</span> : <span className="text-muted-foreground">—</span>;
    },
  },
  {
    accessorKey: "CREDIT",
    header: "Credit",
    cell: ({ getValue }) => {
      const v = Number(getValue() ?? 0);
      return v > 0 ? <span className="tabular-nums text-green-600">{formatCurrency(v)}</span> : <span className="text-muted-foreground">—</span>;
    },
  },
];

const resultaatColumns: ColumnDef<Resultaat>[] = [
  { accessorKey: "REKENINGNUMMER", header: "Rekening", size: 90 },
  { accessorKey: "OMSCHRIJVING", header: "Omschrijving" },
  { accessorKey: "SOORT", header: "Soort", cell: ({ getValue }) => <Badge variant="outline" className="text-xs">{String(getValue() ?? "")}</Badge> },
  { accessorKey: "DEBET_TOTAAL", header: "Debet", cell: ({ getValue }) => <span className="tabular-nums">{formatCurrency(Number(getValue() ?? 0))}</span> },
  { accessorKey: "CREDIT_TOTAAL", header: "Credit", cell: ({ getValue }) => <span className="tabular-nums">{formatCurrency(Number(getValue() ?? 0))}</span> },
  {
    accessorKey: "SALDO",
    header: "Saldo",
    cell: ({ getValue }) => {
      const v = Number(getValue() ?? 0);
      return <span className={`tabular-nums font-medium ${v >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(v)}</span>;
    },
  },
];

function GrootboekInner() {
  const { get, setParams } = useQueryParams();
  const { refetchInterval } = useAutoRefresh();
  const activeDb  = useActiveDb();
  const activeTab = get("tab") ?? "mutaties";

  const mutatieParams = {
    page: Number(get("page") ?? 1),
    pageSize: Number(get("pageSize") ?? 50),
    rubriekId: get("rubriekId") ? Number(get("rubriekId")) : undefined,
  };

  const { data: rubrieken } = useQuery({
    queryKey: ["grootboek", activeDb, "rubrieken"],
    queryFn: grootboekApi.rubrieken,
    staleTime: 300_000,
  });

  const { data: mutaties, isLoading: mutatiesLoading } = useQuery({
    queryKey: ["grootboek", activeDb, "mutaties", mutatieParams],
    queryFn: () => grootboekApi.mutaties(mutatieParams),
    refetchInterval,
    enabled: activeTab === "mutaties",
  });

  const { data: resultaat, isLoading: resultaatLoading } = useQuery({
    queryKey: ["grootboek", activeDb, "resultaat"],
    queryFn: grootboekApi.resultaat,
    refetchInterval,
    enabled: activeTab === "resultaat",
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Grootboek</h1>

      <Tabs value={activeTab} onValueChange={(v) => setParams({ tab: v, page: "1" })}>
        <TabsList>
          <TabsTrigger value="mutaties">Mutaties</TabsTrigger>
          <TabsTrigger value="resultaat">Resultatenrekening</TabsTrigger>
        </TabsList>

        <TabsContent value="mutaties" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <Select
              value={String(mutatieParams.rubriekId ?? "alle")}
              onValueChange={(v) => setParams({ rubriekId: v === "alle" ? null : v, page: "1" })}
            >
              <SelectTrigger className="h-8 w-56 text-sm">
                <SelectValue placeholder="Rubriek" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle rubrieken</SelectItem>
                {(rubrieken as Record<string, unknown>[] | undefined)?.map(r => (
                  <SelectItem key={String(r.ID)} value={String(r.ID)} className="text-sm">
                    {String(r.REKENINGNUMMER)} — {String(r.OMSCHRIJVING)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={mutatieColumns}
            data={(mutaties?.data ?? []) as Mutatie[]}
            loading={mutatiesLoading}
            total={mutaties?.total}
            page={mutatieParams.page}
            pageSize={mutatieParams.pageSize}
            totalPages={mutaties?.totalPages}
            onPageChange={(p) => setParams({ page: String(p) })}
            emptyMessage="Geen mutaties gevonden"
          />
        </TabsContent>

        <TabsContent value="resultaat" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Resultatenrekening — huidig jaar</CardTitle></CardHeader>
            <CardContent>
              <DataTable
                columns={resultaatColumns}
                data={(resultaat as Resultaat[] | undefined) ?? []}
                loading={resultaatLoading}
                emptyMessage="Geen gegevens beschikbaar"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function GrootboekPage() {
  return <Suspense><GrootboekInner /></Suspense>;
}

"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { facturenApi } from "@/lib/api-client";
import { formatDate, formatCurrency, formatDaysOverdue } from "@/lib/format";
import { DataTable } from "@/components/tables/data-table";
import { FilterBar } from "@/components/filters/filter-bar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryParams } from "@/hooks/use-query-params";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Factuur = Record<string, unknown>;

const columns: ColumnDef<Factuur>[] = [
  { accessorKey: "FACTUURNUMMER", header: "Factuurnummer", size: 130 },
  { accessorKey: "KLANT", header: "Klant" },
  { accessorKey: "DATUM", header: "Datum", cell: ({ getValue }) => formatDate(String(getValue() ?? "")) },
  { accessorKey: "VERVALDATUM", header: "Vervaldatum", cell: ({ getValue }) => formatDate(String(getValue() ?? "")) },
  {
    accessorKey: "BEDRAG_EXCL",
    header: "Excl. BTW",
    cell: ({ getValue }) => <span className="tabular-nums">{formatCurrency(Number(getValue() ?? 0))}</span>,
  },
  {
    accessorKey: "TOTAALBEDRAG",
    header: "Totaal",
    cell: ({ getValue }) => <span className="tabular-nums font-medium">{formatCurrency(Number(getValue() ?? 0))}</span>,
  },
  {
    accessorKey: "OPENSTAAND",
    header: "Openstaand",
    cell: ({ getValue }) => {
      const v = Number(getValue() ?? 0);
      return <span className={`tabular-nums ${v > 0 ? "text-orange-600 font-medium" : "text-muted-foreground"}`}>{formatCurrency(v)}</span>;
    },
  },
  {
    accessorKey: "DAGEN_OVERDUE",
    header: "Overdue",
    cell: ({ getValue }) => {
      const v = Number(getValue() ?? 0);
      return v > 0 ? <Badge variant="destructive" className="text-xs">{formatDaysOverdue(v)}</Badge> : null;
    },
  },
  { accessorKey: "STATUS", header: "Status", cell: ({ getValue }) => <Badge variant="outline" className="text-xs">{String(getValue() ?? "")}</Badge> },
];

const AGING_LABELS: Record<string, string> = {
  current: "Niet verlopen",
  "1-30": "1–30 dagen",
  "31-60": "31–60 dagen",
  "61-90": "61–90 dagen",
  "90+": "90+ dagen",
};

function FacturenInner() {
  const { get, setParams, resetParams } = useQueryParams();
  const { refetchInterval } = useAutoRefresh();
  const activeTab = get("tab") ?? "alle";

  const params = {
    page: Number(get("page") ?? 1),
    pageSize: Number(get("pageSize") ?? 50),
    search: get("search") ?? undefined,
    status: activeTab !== "alle" ? activeTab : undefined,
    dateFrom: get("dateFrom") ?? undefined,
    dateTo: get("dateTo") ?? undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["facturen", params],
    queryFn: () => facturenApi.list(params),
    refetchInterval,
  });

  const { data: aging } = useQuery({
    queryKey: ["facturen", "aging"],
    queryFn: facturenApi.aging,
    refetchInterval,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Facturen</h1>

      {/* Aging overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(aging as Record<string, unknown>[] | undefined)?.map((bucket) => (
          <Card key={String(bucket.BUCKET)} className="bg-background">
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {AGING_LABELS[String(bucket.BUCKET)] ?? bucket.BUCKET}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-3">
              <div className="text-base font-bold tabular-nums">{formatCurrency(Number(bucket.BEDRAG ?? 0))}</div>
              <div className="text-xs text-muted-foreground">{Number(bucket.AANTAL ?? 0)} facturen</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setParams({ tab: v, page: "1" })}>
        <TabsList>
          <TabsTrigger value="alle">Alle</TabsTrigger>
          <TabsTrigger value="open">Openstaand</TabsTrigger>
          <TabsTrigger value="betaald">Betaald</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-4">
          <FilterBar
            search={params.search}
            onSearchChange={(v) => setParams({ search: v, page: "1" })}
            dateFrom={params.dateFrom}
            dateTo={params.dateTo}
            onDateChange={(from, to) => setParams({ dateFrom: from, dateTo: to, page: "1" })}
            onReset={resetParams}
          />

          <DataTable
            columns={columns}
            data={(data?.data ?? []) as Factuur[]}
            loading={isLoading}
            total={data?.total}
            page={params.page}
            pageSize={params.pageSize}
            totalPages={data?.totalPages}
            onPageChange={(p) => setParams({ page: String(p) })}
            emptyMessage="Geen facturen gevonden"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function FacturenPage() {
  return (
    <Suspense>
      <FacturenInner />
    </Suspense>
  );
}

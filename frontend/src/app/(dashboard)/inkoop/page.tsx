"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { inkoopApi } from "@/lib/api-client";
import { formatDate, formatCurrency } from "@/lib/format";
import { DataTable } from "@/components/tables/data-table";
import { FilterBar } from "@/components/filters/filter-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryParams } from "@/hooks/use-query-params";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useActiveDb } from "@/hooks/use-active-db";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getChartColor } from "@/lib/chart-colors";
import { PageHeader } from "@/components/ui/page-header";

type Inkoop = Record<string, unknown>;

const columns: ColumnDef<Inkoop>[] = [
  { accessorKey: "FACTUURNUMMER", header: "Factuurnummer", size: 140 },
  { accessorKey: "LEVERANCIER", header: "Leverancier" },
  { accessorKey: "DATUM", header: "Datum", cell: ({ getValue }) => formatDate(String(getValue() ?? "")) },
  { accessorKey: "BEDRAG_EXCL", header: "Excl. BTW", cell: ({ getValue }) => <span className="tabular-nums">{formatCurrency(Number(getValue() ?? 0))}</span> },
  { accessorKey: "BTW", header: "BTW", cell: ({ getValue }) => <span className="tabular-nums">{formatCurrency(Number(getValue() ?? 0))}</span> },
  { accessorKey: "TOTAALBEDRAG", header: "Totaal", cell: ({ getValue }) => <span className="tabular-nums font-medium">{formatCurrency(Number(getValue() ?? 0))}</span> },
  { accessorKey: "STATUS", header: "Status", cell: ({ getValue }) => <Badge variant="secondary" className="text-xs">{String(getValue() ?? "")}</Badge> },
];

function InkoopInner() {
  const { get, setParams, resetParams } = useQueryParams();
  const { refetchInterval } = useAutoRefresh();
  const activeDb = useActiveDb();

  const params = {
    page: Number(get("page") ?? 1),
    pageSize: Number(get("pageSize") ?? 50),
    search: get("search") ?? undefined,
    dateFrom: get("dateFrom") ?? undefined,
    dateTo: get("dateTo") ?? undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["inkoop", activeDb, params],
    queryFn: () => inkoopApi.list(params),
    refetchInterval,
  });

  const { data: perKostensoort } = useQuery({
    queryKey: ["inkoop", activeDb, "per-kostensoort"],
    queryFn: inkoopApi.perKostensoort,
    refetchInterval,
  });

  const rawChart = (perKostensoort as Record<string, unknown>[] | undefined)?.map(r => ({
    name: String(r.KOSTENSOORT ?? ""),
    value: Number(r.BEDRAG ?? 0),
  })) ?? [];
  // Top 8 + rest samenvoegen als "Overig"
  const sorted = [...rawChart].sort((a, b) => b.value - a.value);
  const chartData = sorted.length > 8
    ? [...sorted.slice(0, 8), { name: "Overig", value: sorted.slice(8).reduce((s, r) => s + r.value, 0) }]
    : sorted;

  return (
    <div className="space-y-5">
      <PageHeader title="Inkoop" description="Inkoopfacturen en kostensoort-analyse" />

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2">
          <FilterBar
            search={params.search}
            onSearchChange={(v) => setParams({ search: v, page: "1" })}
            dateFrom={params.dateFrom}
            dateTo={params.dateTo}
            onDateChange={(from, to) => setParams({ dateFrom: from, dateTo: to, page: "1" })}
            onReset={resetParams}
          />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Verdeling dit jaar (top 8)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={70} label={false}>
                  {chartData.map((_, i) => <Cell key={i} fill={getChartColor(i)} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-1">
              {chartData.map((d, i) => {
                const tot = chartData.reduce((s, x) => s + x.value, 0);
                return (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: getChartColor(i) }} />
                      <span className="text-muted-foreground truncate max-w-[130px]">{d.name}</span>
                    </span>
                    <span className="tabular-nums ml-1 shrink-0">{tot > 0 ? (d.value / tot * 100).toFixed(0) : 0}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={(data?.data ?? []) as Inkoop[]}
        loading={isLoading}
        total={data?.total}
        page={params.page}
        pageSize={params.pageSize}
        totalPages={data?.totalPages}
        onPageChange={(p) => setParams({ page: String(p) })}
        emptyMessage="Geen inkoopfacturen gevonden"
      />
    </div>
  );
}

export default function InkoopPage() {
  return <Suspense><InkoopInner /></Suspense>;
}

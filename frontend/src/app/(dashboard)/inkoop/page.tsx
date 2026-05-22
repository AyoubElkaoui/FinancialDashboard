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
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getChartColor } from "@/lib/chart-colors";

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

  const params = {
    page: Number(get("page") ?? 1),
    pageSize: Number(get("pageSize") ?? 50),
    search: get("search") ?? undefined,
    dateFrom: get("dateFrom") ?? undefined,
    dateTo: get("dateTo") ?? undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["inkoop", params],
    queryFn: () => inkoopApi.list(params),
    refetchInterval,
  });

  const { data: perKostensoort } = useQuery({
    queryKey: ["inkoop", "per-kostensoort"],
    queryFn: inkoopApi.perKostensoort,
    refetchInterval,
  });

  const chartData = (perKostensoort as Record<string, unknown>[] | undefined)?.map(r => ({
    name: String(r.KOSTENSOORT ?? ""),
    value: Number(r.BEDRAG ?? 0),
  })) ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Inkoop</h1>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Inkoopfacturen</CardTitle></CardHeader>
          <CardContent>
            <FilterBar
              search={params.search}
              onSearchChange={(v) => setParams({ search: v, page: "1" })}
              dateFrom={params.dateFrom}
              dateTo={params.dateTo}
              onDateChange={(from, to) => setParams({ dateFrom: from, dateTo: to, page: "1" })}
              onReset={resetParams}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Verdeling dit jaar</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={false}>
                  {chartData.map((_, i) => <Cell key={i} fill={getChartColor(i)} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
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
